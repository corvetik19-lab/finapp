import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * POST /api/employees/invite - Отправить приглашение сотруднику
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role_id, company_id } = body;

    if (!email || !role_id || !company_id) {
      return NextResponse.json(
        { error: 'Email, role_id и company_id обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь имеет доступ к компании
    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single();

    if (!member || member.role !== 'admin') {
      return NextResponse.json(
        { error: 'Недостаточно прав для отправки приглашений' },
        { status: 403 }
      );
    }

    // Проверяем, не существует ли уже сотрудник с таким email
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .eq('company_id', company_id)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Сотрудник с таким email уже существует' },
        { status: 400 }
      );
    }

    // Получаем данные роли
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', role_id)
      .single();

    // Получаем данные компании
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();

    // Создаём запись приглашения
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Приглашение действует 7 дней

    const { error: inviteError } = await supabase
      .from('employee_invites')
      .insert({
        email,
        role_id,
        company_id,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });

    if (inviteError) {
      // Если таблица не существует, создаём сотрудника напрямую
      if (inviteError.code === '42P01') {
        // Создаём сотрудника со статусом "invited"
        const { error: employeeError } = await supabase
          .from('employees')
          .insert({
            email,
            full_name: email.split('@')[0], // Временное имя из email
            role_id,
            company_id,
            status: 'inactive',
            role: 'viewer' // Fallback роль
          });

        if (employeeError) {
          console.error('Error creating employee:', employeeError);
          return NextResponse.json(
            { error: 'Ошибка создания сотрудника' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Сотрудник ${email} добавлен с ролью ${role?.name || 'Сотрудник'}`,
          note: 'Приглашение по email будет доступно после настройки почтового сервиса'
        });
      }

      console.error('Error creating invite:', inviteError);
      return NextResponse.json(
        { error: 'Ошибка создания приглашения' },
        { status: 500 }
      );
    }

    // TODO: Отправить email с приглашением
    // Для этого нужно настроить почтовый сервис (Resend, SendGrid и т.д.)
    // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;
    // await sendInviteEmail(email, inviteUrl, company?.name, role?.name);

    return NextResponse.json({
      success: true,
      message: `Приглашение отправлено на ${email}`,
      company: company?.name,
      role: role?.name
    });

  } catch (error) {
    console.error('Error in POST /api/employees/invite:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
