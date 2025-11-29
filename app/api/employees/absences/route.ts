import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Отпуск',
  sick: 'Больничный',
  business_trip: 'Командировка',
  remote: 'Удалённая работа',
  day_off: 'Отгул',
  other: 'Другое'
};

const ABSENCE_STATUS_LABELS: Record<string, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
  cancelled: 'Отменено'
};

/**
 * GET /api/employees/absences - Получить отсутствия
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
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId обязателен' }, { status: 400 });
    }

    let query = supabase
      .from('employee_absences')
      .select(`
        *,
        employee:employees(id, full_name, avatar_url)
      `)
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (startDate) {
      query = query.gte('end_date', startDate);
    }

    if (endDate) {
      query = query.lte('start_date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching absences:', error);
      return NextResponse.json({ error: 'Ошибка получения отсутствий' }, { status: 500 });
    }

    // Добавляем лейблы
    const result = (data || []).map(absence => ({
      ...absence,
      type_label: ABSENCE_TYPE_LABELS[absence.type] || absence.type,
      status_label: ABSENCE_STATUS_LABELS[absence.status] || absence.status
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/employees/absences:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/absences - Создать отсутствие
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employee_id, company_id, type, start_date, end_date, reason } = body;

    if (!employee_id || !company_id || !type || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'employee_id, company_id, type, start_date и end_date обязательны' 
      }, { status: 400 });
    }

    // Проверяем пересечение с существующими отсутствиями
    const { data: existing } = await supabase
      .from('employee_absences')
      .select('id')
      .eq('employee_id', employee_id)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        error: 'На эти даты уже есть запись об отсутствии' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employee_absences')
      .insert({
        employee_id,
        company_id,
        type,
        start_date,
        end_date,
        reason: reason || null,
        status: 'pending',
        created_by: user.id
      })
      .select(`
        *,
        employee:employees(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating absence:', error);
      return NextResponse.json({ error: 'Ошибка создания записи' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      type_label: ABSENCE_TYPE_LABELS[data.type] || data.type,
      status_label: ABSENCE_STATUS_LABELS[data.status] || data.status
    });
  } catch (error) {
    console.error('Error in POST /api/employees/absences:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * PATCH /api/employees/absences - Обновить статус отсутствия
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (status) {
      updateData.status = status;
      if (status === 'approved' || status === 'rejected') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }
    }
    
    if (reason !== undefined) {
      updateData.reason = reason;
    }

    const { data, error } = await supabase
      .from('employee_absences')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating absence:', error);
      return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      type_label: ABSENCE_TYPE_LABELS[data.type] || data.type,
      status_label: ABSENCE_STATUS_LABELS[data.status] || data.status
    });
  } catch (error) {
    console.error('Error in PATCH /api/employees/absences:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/absences - Удалить отсутствие
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

    const { error } = await supabase
      .from('employee_absences')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting absence:', error);
      return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/absences:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
