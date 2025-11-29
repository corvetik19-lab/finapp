import { createRSCClient } from '@/lib/supabase/helpers';

// Интерфейсы для отчёта по показателям менеджеров
export interface ManagerPerformance {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  totalTenders: number;
  wonTenders: number;
  lostTenders: number;
  activeTenders: number;
  winRate: number;
  totalNmck: number;
  totalContractPrice: number;
  avgDealSize: number;
  avgSavings: number;
  efficiency: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ManagerTendersByStage {
  managerId: string;
  managerName: string;
  stages: {
    name: string;
    category: string;
    count: number;
  }[];
}

export interface ManagerMonthlyStats {
  month: string;
  monthLabel: string;
  managerId: string;
  managerName: string;
  tendersCount: number;
  wonCount: number;
  contractSum: number;
}

export interface TeamOverview {
  totalManagers: number;
  totalTenders: number;
  totalWon: number;
  totalLost: number;
  avgWinRate: number;
  totalContractSum: number;
  totalNmck: number;
  avgSavings: number;
  bestManagerId: string | null;
  bestManagerName: string | null;
  bestWinRate: number;
}

export interface ManagerPerformanceReportData {
  overview: TeamOverview;
  managers: ManagerPerformance[];
  byStage: ManagerTendersByStage[];
  monthly: ManagerMonthlyStats[];
}

export interface ManagerPerformanceReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
}

// Хелпер для извлечения первого элемента
function getFirst<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

function getEmptyReport(): ManagerPerformanceReportData {
  return {
    overview: {
      totalManagers: 0,
      totalTenders: 0,
      totalWon: 0,
      totalLost: 0,
      avgWinRate: 0,
      totalContractSum: 0,
      totalNmck: 0,
      avgSavings: 0,
      bestManagerId: null,
      bestManagerName: null,
      bestWinRate: 0,
    },
    managers: [],
    byStage: [],
    monthly: [],
  };
}

export async function getManagerPerformanceReportData(
  params: ManagerPerformanceReportParams
): Promise<ManagerPerformanceReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Получаем тендеры с исполнителями
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      nmck,
      contract_price,
      status,
      created_at,
      stage:tender_stages!tenders_stage_id_fkey(id, name, category),
      executor:employees!tenders_executor_id_fkey(id, full_name, position, avatar_url)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data: tenders, error } = await query;

  if (error) {
    console.error('Error fetching tenders for manager performance:', error);
    return getEmptyReport();
  }

  if (!tenders || tenders.length === 0) {
    return getEmptyReport();
  }

  // Группируем по менеджерам
  const managersMap = new Map<string, {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
    totalTenders: number;
    wonTenders: number;
    lostTenders: number;
    activeTenders: number;
    totalNmck: number;
    totalContractPrice: number;
    stagesCount: Map<string, { name: string; category: string; count: number }>;
  }>();

  const monthlyMap = new Map<string, ManagerMonthlyStats>();
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  for (const tender of tenders) {
    const executor = getFirst(tender.executor as unknown) as { id: string; full_name: string; position: string | null; avatar_url: string | null } | null;
    const stage = getFirst(tender.stage as unknown) as { id: string; name: string; category: string } | null;

    if (!executor) continue;

    const managerId = executor.id;
    const managerName = executor.full_name || 'Неизвестный';

    // Инициализация менеджера
    if (!managersMap.has(managerId)) {
      managersMap.set(managerId, {
        id: managerId,
        name: managerName,
        avatar: executor.avatar_url,
        position: executor.position,
        totalTenders: 0,
        wonTenders: 0,
        lostTenders: 0,
        activeTenders: 0,
        totalNmck: 0,
        totalContractPrice: 0,
        stagesCount: new Map(),
      });
    }

    const manager = managersMap.get(managerId)!;
    manager.totalTenders++;

    // Подсчёт по статусам
    if (tender.status === 'won') {
      manager.wonTenders++;
      manager.totalContractPrice += (tender.contract_price || 0) / 100;
    } else if (tender.status === 'lost') {
      manager.lostTenders++;
    } else {
      manager.activeTenders++;
    }

    manager.totalNmck += (tender.nmck || 0) / 100;

    // По этапам
    if (stage) {
      const stageKey = stage.id;
      if (!manager.stagesCount.has(stageKey)) {
        manager.stagesCount.set(stageKey, {
          name: stage.name,
          category: stage.category,
          count: 0,
        });
      }
      manager.stagesCount.get(stageKey)!.count++;
    }

    // По месяцам
    const createdDate = new Date(tender.created_at);
    const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${managerId}`;
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`,
        monthLabel: `${monthNames[createdDate.getMonth()]} ${createdDate.getFullYear()}`,
        managerId,
        managerName,
        tendersCount: 0,
        wonCount: 0,
        contractSum: 0,
      });
    }
    
    const monthData = monthlyMap.get(monthKey)!;
    monthData.tendersCount++;
    if (tender.status === 'won') {
      monthData.wonCount++;
      monthData.contractSum += (tender.contract_price || 0) / 100;
    }
  }

  // Формируем массив менеджеров
  const managers: ManagerPerformance[] = Array.from(managersMap.values())
    .map(m => {
      const winRate = m.totalTenders > 0 ? (m.wonTenders / m.totalTenders) * 100 : 0;
      const avgDealSize = m.wonTenders > 0 ? m.totalContractPrice / m.wonTenders : 0;
      const avgSavings = m.totalNmck > 0 && m.totalContractPrice > 0 
        ? ((m.totalNmck - m.totalContractPrice) / m.totalNmck) * 100 
        : 0;
      const efficiency = winRate * (m.totalContractPrice / 1000000); // Комплексный показатель

      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        position: m.position,
        totalTenders: m.totalTenders,
        wonTenders: m.wonTenders,
        lostTenders: m.lostTenders,
        activeTenders: m.activeTenders,
        winRate,
        totalNmck: m.totalNmck,
        totalContractPrice: m.totalContractPrice,
        avgDealSize,
        avgSavings,
        efficiency,
        rank: 0,
        trend: 'stable' as const,
      };
    })
    .sort((a, b) => b.winRate - a.winRate);

  // Присваиваем ранги
  managers.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  // Формируем данные по этапам
  const byStage: ManagerTendersByStage[] = Array.from(managersMap.values()).map(m => ({
    managerId: m.id,
    managerName: m.name,
    stages: Array.from(m.stagesCount.values()),
  }));

  // Формируем данные по месяцам
  const monthly = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month));

  // Общая статистика
  const totalManagers = managers.length;
  const totalTenders = managers.reduce((sum, m) => sum + m.totalTenders, 0);
  const totalWon = managers.reduce((sum, m) => sum + m.wonTenders, 0);
  const totalLost = managers.reduce((sum, m) => sum + m.lostTenders, 0);
  const avgWinRate = totalManagers > 0 
    ? managers.reduce((sum, m) => sum + m.winRate, 0) / totalManagers 
    : 0;
  const totalContractSum = managers.reduce((sum, m) => sum + m.totalContractPrice, 0);
  const totalNmck = managers.reduce((sum, m) => sum + m.totalNmck, 0);
  const avgSavings = totalNmck > 0 ? ((totalNmck - totalContractSum) / totalNmck) * 100 : 0;

  const bestManager = managers[0] || null;

  return {
    overview: {
      totalManagers,
      totalTenders,
      totalWon,
      totalLost,
      avgWinRate,
      totalContractSum,
      totalNmck,
      avgSavings,
      bestManagerId: bestManager?.id || null,
      bestManagerName: bestManager?.name || null,
      bestWinRate: bestManager?.winRate || 0,
    },
    managers,
    byStage,
    monthly,
  };
}
