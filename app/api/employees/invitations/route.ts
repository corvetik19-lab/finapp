import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * GET /api/employees/invitations - Получить список приглашений
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId обязателен' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employee_invitations')
      .select(`
        *,
        role:roles(id, name, color)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: 'Ошибка получения приглашений' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/employees/invitations:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/invitations - Создать приглашение
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_id, email, role_id, position, department } = body;

    if (!company_id || !email) {
      return NextResponse.json({ error: 'company_id и email обязательны' }, { status: 400 });
    }

    // Проверяем, нет ли уже активного приглашения
    const { data: existing } = await supabase
      .from('employee_invitations')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Приглашение для этого email уже существует' }, { status: 400 });
    }

    // Проверяем, не является ли пользователь уже сотрудником
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single();

    if (existingEmployee) {
      return NextResponse.json({ error: 'Сотрудник с таким email уже существует' }, { status: 400 });
    }

    // Генерируем токен
    const token = randomBytes(32).toString('hex');
    
    // Срок действия - 7 дней
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('employee_invitations')
      .insert({
        company_id,
        email: email.toLowerCase(),
        role_id: role_id || null,
        position: position || null,
        department: department || null,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        role:roles(id, name, color)
      `)
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: 'Ошибка создания приглашения' }, { status: 500 });
    }

    // TODO: Отправить email с приглашением

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/employees/invitations:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/invitations - Отменить приглашение
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    }

    const { error } = await supabase
      .from('employee_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) {
      console.error('Error cancelling invitation:', error);
      return NextResponse.json({ error: 'Ошибка отмены приглашения' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/invitations:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
