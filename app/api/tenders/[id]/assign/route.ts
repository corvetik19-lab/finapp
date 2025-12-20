import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * POST /api/tenders/[id]/assign - Назначить/переназначить сотрудника на тендер
 * Только для админа организации
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id: tenderId } = await params;
    const body = await request.json();
    const { employee_id } = body;

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем тендер для проверки company_id
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('id, company_id, stage_id')
      .eq('id', tenderId)
      .single();

    if (tenderError || !tender) {
      return NextResponse.json({ error: 'Тендер не найден' }, { status: 404 });
    }

    // Проверяем что пользователь - админ организации
    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', tender.company_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // Также проверяем глобальную роль
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const isAdmin = member?.role === 'admin' || 
                    profile?.global_role === 'super_admin' || 
                    profile?.global_role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Только админ организации может назначать тендеры' },
        { status: 403 }
      );
    }

    // Если employee_id передан - назначаем, если null - убираем всех ответственных
    if (employee_id) {
      // Проверяем что сотрудник существует и принадлежит той же компании
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, company_id')
        .eq('id', employee_id)
        .eq('company_id', tender.company_id)
        .is('deleted_at', null)
        .single();

      if (empError || !employee) {
        return NextResponse.json(
          { error: 'Сотрудник не найден или не принадлежит компании' },
          { status: 400 }
        );
      }

      // Удаляем текущих ответственных
      await supabase
        .from('tender_responsible')
        .delete()
        .eq('tender_id', tenderId);

      // Назначаем нового ответственного
      const { error: insertError } = await supabase
        .from('tender_responsible')
        .insert({
          tender_id: tenderId,
          employee_id: employee_id
        });

      if (insertError) {
        console.error('Error assigning employee:', insertError);
        return NextResponse.json(
          { error: 'Ошибка при назначении сотрудника' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Тендер назначен сотруднику: ${employee.full_name}`,
        employee: {
          id: employee.id,
          full_name: employee.full_name
        }
      });
    } else {
      // Убираем всех ответственных (делаем тендер свободным)
      await supabase
        .from('tender_responsible')
        .delete()
        .eq('tender_id', tenderId);

      return NextResponse.json({
        success: true,
        message: 'Тендер освобождён (нет назначенных сотрудников)'
      });
    }
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/assign:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenders/[id]/assign - Получить назначенных сотрудников
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем назначенных сотрудников с их данными
    const { data: responsible, error } = await supabase
      .from('tender_responsible')
      .select(`
        id,
        employee_id,
        created_at,
        employee:employees!tender_responsible_employee_id_fkey(
          id,
          full_name,
          email,
          position,
          role_data:roles!employees_role_id_fkey(
            id,
            name,
            color
          )
        )
      `)
      .eq('tender_id', tenderId);

    if (error) {
      console.error('Error fetching responsible:', error);
      return NextResponse.json(
        { error: 'Ошибка при получении ответственных' },
        { status: 500 }
      );
    }

    return NextResponse.json(responsible || []);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/assign:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
