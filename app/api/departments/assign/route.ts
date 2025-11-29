import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * POST /api/departments/assign - Назначить сотрудников в отдел
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { department_id, employee_ids, company_id } = body;

    if (!department_id || !company_id) {
      return NextResponse.json({ 
        error: 'department_id и company_id обязательны' 
      }, { status: 400 });
    }

    // Проверяем что отдел существует и принадлежит компании
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('id', department_id)
      .eq('company_id', company_id)
      .single();

    if (!dept) {
      return NextResponse.json({ error: 'Отдел не найден' }, { status: 404 });
    }

    // Сначала убираем всех сотрудников из этого отдела
    await supabase
      .from('employees')
      .update({ department_id: null })
      .eq('company_id', company_id)
      .eq('department_id', department_id);

    // Затем назначаем выбранных сотрудников
    if (employee_ids && employee_ids.length > 0) {
      const { error } = await supabase
        .from('employees')
        .update({ department_id })
        .eq('company_id', company_id)
        .in('id', employee_ids);

      if (error) {
        console.error('Error assigning employees:', error);
        return NextResponse.json({ error: 'Ошибка назначения сотрудников' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      assigned_count: employee_ids?.length || 0 
    });
  } catch (error) {
    console.error('Error in POST /api/departments/assign:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
