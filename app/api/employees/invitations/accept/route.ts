import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/employees/invitations/accept - Получить информацию о приглашении по токену
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Токен обязателен' }, { status: 400 });
    }

    const { data: invitation, error } = await supabase
      .from('employee_invitations')
      .select(`
        *,
        company:companies(id, name),
        role:roles(id, name, color)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Приглашение не найдено' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: invitation.status === 'accepted' 
          ? 'Приглашение уже принято' 
          : invitation.status === 'expired'
          ? 'Приглашение истекло'
          : 'Приглашение отменено'
      }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Обновляем статус на expired
      await supabase
        .from('employee_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'Приглашение истекло' }, { status: 400 });
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      position: invitation.position,
      department: invitation.department,
      company: invitation.company,
      role: invitation.role,
      expires_at: invitation.expires_at
    });
  } catch (error) {
    console.error('Error in GET /api/employees/invitations/accept:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/invitations/accept - Принять приглашение
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Необходимо войти в систему' }, { status: 401 });
    }

    const body = await request.json();
    const { token, full_name, phone } = body;

    if (!token) {
      return NextResponse.json({ error: 'Токен обязателен' }, { status: 400 });
    }

    // Получаем приглашение
    const { data: invitation, error: invError } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Приглашение не найдено или недействительно' }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Приглашение истекло' }, { status: 400 });
    }

    // Проверяем email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ 
        error: `Это приглашение для ${invitation.email}. Войдите с правильным email.` 
      }, { status: 400 });
    }

    // Создаём сотрудника
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .insert({
        company_id: invitation.company_id,
        user_id: user.id,
        full_name: full_name || user.email?.split('@')[0] || 'Сотрудник',
        email: invitation.email,
        phone: phone || null,
        position: invitation.position || null,
        department: invitation.department || null,
        role_id: invitation.role_id || null,
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (empError) {
      console.error('Error creating employee:', empError);
      return NextResponse.json({ error: 'Ошибка создания сотрудника' }, { status: 500 });
    }

    // Добавляем в company_members
    await supabase
      .from('company_members')
      .insert({
        company_id: invitation.company_id,
        user_id: user.id,
        role: 'member',
        status: 'active'
      });

    // Обновляем приглашение
    await supabase
      .from('employee_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      employee_id: employee.id,
      company_id: invitation.company_id
    });
  } catch (error) {
    console.error('Error in POST /api/employees/invitations/accept:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
