import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { getEmployeeById } from '@/lib/employees/service';

/**
 * GET /api/employees/[id]/tenders - Получить тендеры сотрудника
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id } = await params;

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем что сотрудник существует
    const employee = await getEmployeeById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Получаем параметры фильтрации
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Строим запрос
    let query = supabase
      .from('tenders')
      .select('id, number, name, status, nmck, deadline, created_at')
      .eq('responsible_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Фильтр по статусу
    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.in('status', ['draft', 'preparation', 'submitted', 'consideration']);
      } else if (status === 'completed') {
        query = query.in('status', ['won', 'lost', 'cancelled']);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data: tenders, error } = await query;

    if (error) {
      console.error('Error fetching employee tenders:', error);
      return NextResponse.json(
        { error: 'Ошибка при получении тендеров' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenders: tenders || [],
      total: tenders?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/employees/[id]/tenders:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
