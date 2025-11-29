import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/departments - Получить список отделов
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

    // Загружаем отделы без JOIN (чтобы избежать проблем с NULL в head_id/parent_id)
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json({ error: 'Ошибка получения отделов' }, { status: 500 });
    }

    // Подсчитываем количество сотрудников в каждом отделе
    const { data: employees } = await supabase
      .from('employees')
      .select('id, department_id, full_name, avatar_url')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .is('deleted_at', null);

    const employeeCounts: Record<string, number> = {};
    (employees || []).forEach((emp: { department_id: string | null }) => {
      if (emp.department_id) {
        employeeCounts[emp.department_id] = (employeeCounts[emp.department_id] || 0) + 1;
      }
    });

    // Формируем результат с руководителями и родительскими отделами
    const result = (data || []).map(dept => {
      const head = dept.head_id 
        ? (employees || []).find((e: { id: string }) => e.id === dept.head_id) || null
        : null;
      const parent = dept.parent_id
        ? (data || []).find(d => d.id === dept.parent_id) || null
        : null;

      return {
        ...dept,
        employees_count: employeeCounts[dept.id] || 0,
        head: head ? { id: head.id, full_name: head.full_name, avatar_url: head.avatar_url } : null,
        parent: parent ? { id: parent.id, name: parent.name } : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/departments:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/departments - Создать отдел
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_id, name, description, head_id, parent_id, color } = body;

    if (!company_id || !name) {
      return NextResponse.json({ error: 'company_id и name обязательны' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({
        company_id,
        name,
        description: description || null,
        head_id: head_id || null,
        parent_id: parent_id || null,
        color: color || '#3b82f6'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating department:', error);
      return NextResponse.json({ error: 'Ошибка создания отдела' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/departments:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * PATCH /api/departments - Обновить отдел
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idFromQuery = searchParams.get('id');
    
    const body = await request.json();
    const { id: idFromBody, name, description, head_id, parent_id, color } = body;
    
    const id = idFromQuery || idFromBody;

    if (!id) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (head_id !== undefined) updateData.head_id = head_id;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (color !== undefined) updateData.color = color;

    const { data, error } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating department:', error);
      return NextResponse.json({ error: 'Ошибка обновления отдела' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/departments:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/departments - Удалить отдел
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    }

    // Проверяем, есть ли сотрудники в отделе
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id);

    if (count && count > 0) {
      return NextResponse.json({ 
        error: `Нельзя удалить отдел, в нём ${count} сотрудников` 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting department:', error);
      return NextResponse.json({ error: 'Ошибка удаления отдела' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/departments:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
