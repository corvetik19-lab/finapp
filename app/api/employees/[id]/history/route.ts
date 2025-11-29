import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/employees/[id]/history - Получить историю изменений сотрудника
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем историю
    const { data, error } = await supabase
      .from('employee_history')
      .select(`
        id,
        action,
        field_name,
        old_value,
        new_value,
        changed_at,
        comment,
        changed_by
      `)
      .eq('employee_id', id)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching employee history:', error);
      return NextResponse.json({ error: 'Ошибка получения истории' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/employees/[id]/history:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/[id]/history - Добавить запись в историю
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, field_name, old_value, new_value, comment } = body;

    // Получаем company_id сотрудника
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Добавляем запись
    const { data, error } = await supabase
      .from('employee_history')
      .insert({
        employee_id: id,
        company_id: employee.company_id,
        action,
        field_name,
        old_value,
        new_value,
        changed_by: user.id,
        comment
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting employee history:', error);
      return NextResponse.json({ error: 'Ошибка добавления записи' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/employees/[id]/history:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
