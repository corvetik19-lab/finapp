import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { getEmployeeById, getEmployeeTenderStats } from '@/lib/employees/service';

/**
 * GET /api/employees/[id]/stats - Получить статистику сотрудника по тендерам
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id } = await params;
    
    // Проверяем существование сотрудника
    const employee = await getEmployeeById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем статистику
    const stats = await getEmployeeTenderStats(id);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/employees/[id]/stats:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статистики' },
      { status: 500 }
    );
  }
}
