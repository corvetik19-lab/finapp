import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/employees/[id]/activity - Получить активность сотрудника по месяцам
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

    // Получаем тендеры за последние 6 месяцев
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: tenders, error } = await supabase
      .from('tenders')
      .select('id, status, created_at')
      .eq('responsible_id', id)
      .gte('created_at', sixMonthsAgo.toISOString())
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching tenders:', error);
      return NextResponse.json({ error: 'Ошибка получения данных' }, { status: 500 });
    }

    // Группируем по месяцам
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const activityByMonth: Record<string, { tenders_count: number; won_count: number; lost_count: number }> = {};

    // Инициализируем последние 6 месяцев
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      activityByMonth[key] = { tenders_count: 0, won_count: 0, lost_count: 0 };
    }

    // Заполняем данными
    (tenders || []).forEach((tender: { id: string; status: string; created_at: string }) => {
      const date = new Date(tender.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (activityByMonth[key]) {
        activityByMonth[key].tenders_count++;
        if (tender.status === 'won') {
          activityByMonth[key].won_count++;
        } else if (tender.status === 'lost') {
          activityByMonth[key].lost_count++;
        }
      }
    });

    // Преобразуем в массив
    const result = Object.entries(activityByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
          ...value
        };
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/employees/[id]/activity:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
