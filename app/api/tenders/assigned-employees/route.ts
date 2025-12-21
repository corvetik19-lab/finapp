import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/tenders/assigned-employees - Получить ID сотрудников назначенных на тендеры
 * Возвращает список ID сотрудников которые уже назначены на активные тендеры
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем company_id из параметров
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id обязателен' }, { status: 400 });
    }

    // Получаем список активных тендеров (не удалённых и не в архивных этапах)
    const archivedStageNames = [
      'Не участвуем',
      'Не прошло проверку',
      'Не подано',
      'Проиграли',
      'Договор не заключен',
      'Завершен',
      'Отменён'
    ];

    // Получаем ID архивных этапов
    const { data: archivedStages } = await supabase
      .from('tender_stages')
      .select('id')
      .in('name', archivedStageNames);

    const archivedStageIds = (archivedStages || []).map(s => s.id);

    // Получаем все назначения на активные тендеры
    let query = supabase
      .from('tender_responsible')
      .select(`
        employee_id,
        tender:tenders!inner(
          id,
          company_id,
          deleted_at,
          stage_id
        )
      `)
      .eq('tender.company_id', companyId)
      .is('tender.deleted_at', null);

    // Исключаем архивные этапы если есть
    if (archivedStageIds.length > 0) {
      // Используем not.in для исключения архивных этапов
      query = query.filter('tender.stage_id', 'not.in', `(${archivedStageIds.join(',')})`);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching assigned employees:', error);
      return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
    }

    // Собираем уникальные ID сотрудников
    const employeeIds = [...new Set((assignments || []).map(a => a.employee_id))];

    return NextResponse.json({
      employee_ids: employeeIds,
      count: employeeIds.length
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/assigned-employees:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
