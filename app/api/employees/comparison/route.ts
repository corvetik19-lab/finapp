import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/employees/comparison - Получить сравнение сотрудников по эффективности
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

    // Получаем всех активных сотрудников компании
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, avatar_url')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return NextResponse.json({ error: 'Ошибка получения сотрудников' }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json([]);
    }

    const employeeIds = employees.map(e => e.id);

    // Получаем статистику по тендерам для каждого сотрудника
    const { data: tenders, error: tendersError } = await supabase
      .from('tenders')
      .select('responsible_id, status, nmck')
      .in('responsible_id', employeeIds)
      .is('deleted_at', null);

    if (tendersError) {
      console.error('Error fetching tenders:', tendersError);
      return NextResponse.json({ error: 'Ошибка получения тендеров' }, { status: 500 });
    }

    // Агрегируем статистику
    const statsMap: Record<string, {
      total_tenders: number;
      won_tenders: number;
      total_nmck: number;
    }> = {};

    employeeIds.forEach(id => {
      statsMap[id] = { total_tenders: 0, won_tenders: 0, total_nmck: 0 };
    });

    (tenders || []).forEach((tender: { responsible_id: string; status: string; nmck: number }) => {
      if (statsMap[tender.responsible_id]) {
        statsMap[tender.responsible_id].total_tenders++;
        if (tender.status === 'won') {
          statsMap[tender.responsible_id].won_tenders++;
          statsMap[tender.responsible_id].total_nmck += tender.nmck || 0;
        }
      }
    });

    // Формируем результат
    const result = employees.map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      avatar_url: emp.avatar_url,
      total_tenders: statsMap[emp.id].total_tenders,
      won_tenders: statsMap[emp.id].won_tenders,
      success_rate: statsMap[emp.id].total_tenders > 0
        ? (statsMap[emp.id].won_tenders / statsMap[emp.id].total_tenders) * 100
        : 0,
      total_nmck: statsMap[emp.id].total_nmck
    }));

    // Сортируем по успешности (убывание)
    result.sort((a, b) => {
      // Сначала по success_rate
      if (b.success_rate !== a.success_rate) {
        return b.success_rate - a.success_rate;
      }
      // Затем по количеству выигранных
      return b.won_tenders - a.won_tenders;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/employees/comparison:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
