import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    // Получаем все тендеры компании
    const { data: tenders, error: tendersError } = await supabase
      .from('tenders')
      .select('*, stage:tender_stages(*), type:tender_types(*)')
      .eq('company_id', companyId);

    if (tendersError) {
      console.error('Error fetching tenders:', tendersError);
      return NextResponse.json(
        { error: 'Failed to fetch tenders' },
        { status: 500 }
      );
    }

    // Общая статистика
    const totalTenders = tenders?.length || 0;
    const totalNmck = tenders?.reduce((sum, t) => sum + (t.nmck || 0), 0) || 0;
    const totalContractPrice = tenders?.reduce((sum, t) => sum + (t.contract_price || 0), 0) || 0;
    const totalSavings = totalNmck - totalContractPrice;

    // Статистика по этапам
    const tendersByStage = tenders?.reduce((acc: Record<string, { count: number; nmck: number; color: string }>, tender) => {
      const stageName = tender.stage?.name || 'Без этапа';
      if (!acc[stageName]) {
        acc[stageName] = {
          count: 0,
          nmck: 0,
          color: tender.stage?.color || '#gray',
        };
      }
      acc[stageName].count++;
      acc[stageName].nmck += tender.nmck || 0;
      return acc;
    }, {});

    // Статистика по типам
    const tendersByType = tenders?.reduce((acc: Record<string, { count: number; nmck: number }>, tender) => {
      const typeName = tender.type?.name || 'Без типа';
      if (!acc[typeName]) {
        acc[typeName] = {
          count: 0,
          nmck: 0,
        };
      }
      acc[typeName].count++;
      acc[typeName].nmck += tender.nmck || 0;
      return acc;
    }, {});

    // Статистика по месяцам (последние 12 месяцев)
    const monthlyStats = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });

      const monthTenders = tenders?.filter((t) => {
        if (!t.created_at) return false;
        const tenderMonth = t.created_at.slice(0, 7);
        return tenderMonth === monthKey;
      }) || [];

      monthlyStats.push({
        month: monthName,
        count: monthTenders.length,
        nmck: monthTenders.reduce((sum, t) => sum + (t.nmck || 0), 0),
        won: monthTenders.filter((t) => t.stage?.is_final && t.contract_price).length,
      });
    }

    // Статистика выигрышей
    const wonTenders = tenders?.filter((t) => t.stage?.is_final && t.contract_price) || [];
    const lostTenders = tenders?.filter((t) => t.stage?.is_final && !t.contract_price) || [];
    const activeTenders = tenders?.filter((t) => !t.stage?.is_final) || [];

    // Топ менеджеров (если есть поле manager)
    const managerStats = tenders?.reduce((acc: Record<string, { count: number; won: number; nmck: number; contractPrice: number }>, tender) => {
      const manager = tender.manager || 'Не назначен';
      if (!acc[manager]) {
        acc[manager] = {
          count: 0,
          won: 0,
          nmck: 0,
          contractPrice: 0,
        };
      }
      acc[manager].count++;
      acc[manager].nmck += tender.nmck || 0;
      if (tender.stage?.is_final && tender.contract_price) {
        acc[manager].won++;
        acc[manager].contractPrice += tender.contract_price;
      }
      return acc;
    }, {});

    const topManagers = Object.entries(managerStats || {})
      .map(([name, stats]: [string, { count: number; won: number; nmck: number; contractPrice: number }]) => ({
        name,
        ...stats,
        winRate: stats.count > 0 ? (stats.won / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.won - a.won)
      .slice(0, 5);

    return NextResponse.json({
      overview: {
        totalTenders,
        activeTenders: activeTenders.length,
        wonTenders: wonTenders.length,
        lostTenders: lostTenders.length,
        totalNmck,
        totalContractPrice,
        totalSavings,
        winRate: totalTenders > 0 ? (wonTenders.length / totalTenders) * 100 : 0,
      },
      byStage: tendersByStage,
      byType: tendersByType,
      monthly: monthlyStats,
      topManagers,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
