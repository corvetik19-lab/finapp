'use server';

import { createRSCClient } from '@/lib/supabase/server';

export interface SummaryReportData {
  // Общая статистика
  overview: {
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    winRate: number;
    totalNmck: number;
    totalContractPrice: number;
    totalSavings: number;
    savingsPercent: number;
    avgDealSize: number;
  };
  
  // Воронка продаж (по этапам)
  funnel: Array<{
    stageId: string;
    stageName: string;
    stageColor: string;
    category: string;
    count: number;
    totalNmck: number;
    percent: number;
  }>;
  
  // По типам тендеров
  byType: Array<{
    typeId: string;
    typeName: string;
    count: number;
    totalNmck: number;
    wonCount: number;
  }>;
  
  // По площадкам
  byPlatform: Array<{
    platformId: string;
    platformName: string;
    count: number;
    totalNmck: number;
    wonCount: number;
  }>;
  
  // Топ заказчиков
  topCustomers: Array<{
    customer: string;
    count: number;
    totalNmck: number;
    wonCount: number;
    avgNmck: number;
  }>;
  
  // Топ менеджеров
  topManagers: Array<{
    managerId: string;
    managerName: string;
    count: number;
    wonCount: number;
    winRate: number;
    totalNmck: number;
  }>;
  
  // Динамика по месяцам
  monthly: Array<{
    month: string;
    monthLabel: string;
    count: number;
    wonCount: number;
    totalNmck: number;
    contractPrice: number;
  }>;
  
  // Финансовый баланс
  financial: {
    totalIncome: number; // Сумма контрактов (выигранные)
    totalExpenses: number; // Сумма обеспечений и расходов
    profit: number;
    profitMargin: number;
  };
  
  // Сроки
  timing: {
    avgDaysToWin: number;
    avgDaysInProgress: number;
    upcomingDeadlines: number; // Тендеры со скорым дедлайном
    overdueCount: number; // Просроченные
  };
}

export interface SummaryReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  managerId?: string;
}

/**
 * Получить данные для сводного отчёта
 */
export async function getSummaryReportData(
  params: SummaryReportParams
): Promise<SummaryReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;
  
  // Формируем базовый запрос
  let baseQuery = supabase
    .from('tenders')
    .select(`
      id,
      status,
      stage_id,
      type_id,
      platform_id,
      customer,
      nmck,
      contract_price,
      application_security,
      contract_security,
      manager_id,
      submission_deadline,
      auction_date,
      created_at,
      stage:tender_stages(id, name, color, category),
      type:tender_types(id, name),
      platform:tender_platforms(id, name),
      manager:employees!tenders_manager_id_fkey(id, full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    baseQuery = baseQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    baseQuery = baseQuery.lte('created_at', dateTo + 'T23:59:59');
  }
  if (params.managerId) {
    baseQuery = baseQuery.eq('manager_id', params.managerId);
  }

  const { data: tenders, error } = await baseQuery;

  if (error || !tenders) {
    console.error('Error fetching tenders for summary:', error);
    return getEmptyReport();
  }

  // Расчёт статистики
  const totalTenders = tenders.length;
  const wonTenders = tenders.filter(t => t.status === 'won').length;
  const lostTenders = tenders.filter(t => t.status === 'lost').length;
  const activeTenders = tenders.filter(t => 
    !['won', 'lost', 'cancelled', 'completed'].includes(t.status || '')
  ).length;
  
  const totalNmck = tenders.reduce((sum, t) => sum + (t.nmck || 0), 0);
  const totalContractPrice = tenders
    .filter(t => t.status === 'won')
    .reduce((sum, t) => sum + (t.contract_price || t.nmck || 0), 0);
  const totalSavings = tenders
    .filter(t => t.status === 'won' && t.contract_price && t.nmck)
    .reduce((sum, t) => sum + ((t.nmck || 0) - (t.contract_price || 0)), 0);
  
  const winRate = totalTenders > 0 ? (wonTenders / totalTenders) * 100 : 0;
  const savingsPercent = totalNmck > 0 ? (totalSavings / totalNmck) * 100 : 0;
  const avgDealSize = wonTenders > 0 ? totalContractPrice / wonTenders : 0;

  // Хелпер для извлечения первого элемента из joined данных
  const getFirst = <T>(data: T | T[] | null): T | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  };

  // Воронка по этапам
  const stageMap = new Map<string, { name: string; color: string; category: string; count: number; totalNmck: number }>();
  tenders.forEach(t => {
    const stage = getFirst(t.stage as unknown) as { id: string; name: string; color: string; category: string } | null;
    if (stage) {
      const existing = stageMap.get(stage.id) || { 
        name: stage.name, 
        color: stage.color || '#6b7280', 
        category: stage.category || 'other',
        count: 0, 
        totalNmck: 0 
      };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      stageMap.set(stage.id, existing);
    }
  });
  
  const funnel = Array.from(stageMap.entries())
    .map(([stageId, data]) => ({
      stageId,
      stageName: data.name,
      stageColor: data.color,
      category: data.category,
      count: data.count,
      totalNmck: data.totalNmck,
      percent: totalTenders > 0 ? (data.count / totalTenders) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // По типам
  const typeMap = new Map<string, { name: string; count: number; totalNmck: number; wonCount: number }>();
  tenders.forEach(t => {
    const type = getFirst(t.type as unknown) as { id: string; name: string } | null;
    if (type) {
      const existing = typeMap.get(type.id) || { name: type.name, count: 0, totalNmck: 0, wonCount: 0 };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.wonCount++;
      typeMap.set(type.id, existing);
    }
  });
  
  const byType = Array.from(typeMap.entries())
    .map(([typeId, data]) => ({
      typeId,
      typeName: data.name,
      count: data.count,
      totalNmck: data.totalNmck,
      wonCount: data.wonCount,
    }))
    .sort((a, b) => b.count - a.count);

  // По площадкам
  const platformMap = new Map<string, { name: string; count: number; totalNmck: number; wonCount: number }>();
  tenders.forEach(t => {
    const platform = getFirst(t.platform as unknown) as { id: string; name: string } | null;
    if (platform) {
      const existing = platformMap.get(platform.id) || { name: platform.name, count: 0, totalNmck: 0, wonCount: 0 };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.wonCount++;
      platformMap.set(platform.id, existing);
    }
  });
  
  const byPlatform = Array.from(platformMap.entries())
    .map(([platformId, data]) => ({
      platformId,
      platformName: data.name,
      count: data.count,
      totalNmck: data.totalNmck,
      wonCount: data.wonCount,
    }))
    .sort((a, b) => b.count - a.count);

  // Топ заказчиков
  const customerMap = new Map<string, { count: number; totalNmck: number; wonCount: number }>();
  tenders.forEach(t => {
    if (t.customer) {
      const existing = customerMap.get(t.customer) || { count: 0, totalNmck: 0, wonCount: 0 };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.wonCount++;
      customerMap.set(t.customer, existing);
    }
  });
  
  const topCustomers = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      count: data.count,
      totalNmck: data.totalNmck,
      wonCount: data.wonCount,
      avgNmck: data.count > 0 ? data.totalNmck / data.count : 0,
    }))
    .sort((a, b) => b.totalNmck - a.totalNmck)
    .slice(0, 10);

  // Топ менеджеров
  const managerMap = new Map<string, { name: string; count: number; wonCount: number; totalNmck: number }>();
  tenders.forEach(t => {
    const manager = getFirst(t.manager as unknown) as { id: string; full_name: string } | null;
    if (manager) {
      const existing = managerMap.get(manager.id) || { name: manager.full_name, count: 0, wonCount: 0, totalNmck: 0 };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.wonCount++;
      managerMap.set(manager.id, existing);
    }
  });
  
  const topManagers = Array.from(managerMap.entries())
    .map(([managerId, data]) => ({
      managerId,
      managerName: data.name,
      count: data.count,
      wonCount: data.wonCount,
      winRate: data.count > 0 ? (data.wonCount / data.count) * 100 : 0,
      totalNmck: data.totalNmck,
    }))
    .sort((a, b) => b.wonCount - a.wonCount)
    .slice(0, 10);

  // Динамика по месяцам (последние 12 месяцев)
  const monthlyMap = new Map<string, { count: number; wonCount: number; totalNmck: number; contractPrice: number }>();
  const now = new Date();
  
  // Инициализируем последние 12 месяцев
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { count: 0, wonCount: 0, totalNmck: 0, contractPrice: 0 });
  }
  
  tenders.forEach(t => {
    const date = new Date(t.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') {
        existing.wonCount++;
        existing.contractPrice += t.contract_price || t.nmck || 0;
      }
    }
  });
  
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, m] = month.split('-');
      const monthIndex = parseInt(m) - 1;
      return {
        month,
        monthLabel: `${monthNames[monthIndex]} ${year.slice(2)}`,
        count: data.count,
        wonCount: data.wonCount,
        totalNmck: data.totalNmck,
        contractPrice: data.contractPrice,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Финансы
  const totalSecurities = tenders.reduce((sum, t) => 
    sum + (t.application_security || 0) + (t.contract_security || 0), 0
  );
  
  const financial = {
    totalIncome: totalContractPrice,
    totalExpenses: totalSecurities,
    profit: totalContractPrice - totalSecurities,
    profitMargin: totalContractPrice > 0 ? ((totalContractPrice - totalSecurities) / totalContractPrice) * 100 : 0,
  };

  // Сроки
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingDeadlines = tenders.filter(t => {
    if (!t.submission_deadline || ['won', 'lost', 'cancelled', 'completed'].includes(t.status || '')) return false;
    const deadline = new Date(t.submission_deadline);
    return deadline >= today && deadline <= weekFromNow;
  }).length;
  
  const overdueCount = tenders.filter(t => {
    if (!t.submission_deadline || ['won', 'lost', 'cancelled', 'completed'].includes(t.status || '')) return false;
    const deadline = new Date(t.submission_deadline);
    return deadline < today;
  }).length;

  const timing = {
    avgDaysToWin: 30, // Можно рассчитать из дат
    avgDaysInProgress: 14,
    upcomingDeadlines,
    overdueCount,
  };

  return {
    overview: {
      totalTenders,
      activeTenders,
      wonTenders,
      lostTenders,
      winRate,
      totalNmck,
      totalContractPrice,
      totalSavings,
      savingsPercent,
      avgDealSize,
    },
    funnel,
    byType,
    byPlatform,
    topCustomers,
    topManagers,
    monthly,
    financial,
    timing,
  };
}

function getEmptyReport(): SummaryReportData {
  return {
    overview: {
      totalTenders: 0,
      activeTenders: 0,
      wonTenders: 0,
      lostTenders: 0,
      winRate: 0,
      totalNmck: 0,
      totalContractPrice: 0,
      totalSavings: 0,
      savingsPercent: 0,
      avgDealSize: 0,
    },
    funnel: [],
    byType: [],
    byPlatform: [],
    topCustomers: [],
    topManagers: [],
    monthly: [],
    financial: {
      totalIncome: 0,
      totalExpenses: 0,
      profit: 0,
      profitMargin: 0,
    },
    timing: {
      avgDaysToWin: 0,
      avgDaysInProgress: 0,
      upcomingDeadlines: 0,
      overdueCount: 0,
    },
  };
}
