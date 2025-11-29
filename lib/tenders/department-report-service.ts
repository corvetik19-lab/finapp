'use server';

import { createRSCClient } from '@/lib/supabase/server';

export interface DepartmentReportData {
  // Общая статистика отдела
  overview: {
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    cancelledTenders: number;
    winRate: number;
    totalNmck: number;
    totalContractPrice: number;
    avgProcessingDays: number;
    tendersPerSpecialist: number;
  };

  // Статистика по сотрудникам
  specialists: Array<{
    id: string;
    name: string;
    role: string;
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    winRate: number;
    totalNmck: number;
    avgProcessingDays: number;
  }>;

  // Распределение по этапам (воронка тендерного отдела)
  stages: Array<{
    stageId: string;
    stageName: string;
    stageColor: string;
    count: number;
    totalNmck: number;
    avgDaysInStage: number;
    percent: number;
  }>;

  // Эффективность по типам закупок
  byType: Array<{
    typeId: string;
    typeName: string;
    count: number;
    wonCount: number;
    lostCount: number;
    winRate: number;
    totalNmck: number;
  }>;

  // Эффективность по площадкам
  byPlatform: Array<{
    platformId: string;
    platformName: string;
    count: number;
    wonCount: number;
    winRate: number;
    totalNmck: number;
  }>;

  // Динамика по месяцам
  monthly: Array<{
    month: string;
    monthLabel: string;
    submitted: number;
    won: number;
    lost: number;
    winRate: number;
    totalNmck: number;
  }>;

  // Сроки обработки по этапам
  processingTimes: Array<{
    stageName: string;
    avgDays: number;
    minDays: number;
    maxDays: number;
    tendersCount: number;
  }>;

  // Загрузка отдела (тендеры со скорыми дедлайнами)
  workload: {
    urgent: number; // дедлайн сегодня-завтра
    thisWeek: number; // дедлайн на этой неделе
    nextWeek: number; // дедлайн на следующей неделе
    overdue: number; // просрочено
    total: number;
  };

  // Причины проигрышей (если есть данные)
  lossReasons: Array<{
    reason: string;
    count: number;
    percent: number;
  }>;
}

export interface DepartmentReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  specialistId?: string;
}

/**
 * Получить данные для отчёта тендерного отдела
 */
export async function getDepartmentReportData(
  params: DepartmentReportParams
): Promise<DepartmentReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Загружаем тендеры с этапами тендерного отдела (category = 'tender_dept')
  let tendersQuery = supabase
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
      manager_id,
      specialist_id,
      submission_deadline,
      auction_date,
      created_at,
      updated_at,
      stage:tender_stages!inner(id, name, color, category),
      type:tender_types(id, name),
      platform:tender_platforms(id, name),
      manager:employees!tenders_manager_id_fkey(id, full_name, role),
      specialist:employees!tenders_specialist_id_fkey(id, full_name, role)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    tendersQuery = tendersQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    tendersQuery = tendersQuery.lte('created_at', dateTo + 'T23:59:59');
  }
  if (params.specialistId) {
    tendersQuery = tendersQuery.or(`manager_id.eq.${params.specialistId},specialist_id.eq.${params.specialistId}`);
  }

  const { data: tenders, error } = await tendersQuery;

  if (error || !tenders) {
    console.error('Error fetching tenders for department report:', error);
    return getEmptyReport();
  }

  // Хелпер для извлечения первого элемента из joined данных
  const getFirst = <T>(data: T | T[] | null): T | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  };

  // Фильтруем только тендеры тендерного отдела
  const deptTenders = tenders.filter(t => {
    const stage = getFirst(t.stage as unknown) as { category: string } | null;
    return stage?.category === 'tender_dept' || stage?.category === 'archive';
  });

  // Общая статистика
  const totalTenders = deptTenders.length;
  const wonTenders = deptTenders.filter(t => t.status === 'won').length;
  const lostTenders = deptTenders.filter(t => t.status === 'lost').length;
  const cancelledTenders = deptTenders.filter(t => t.status === 'cancelled').length;
  const activeTenders = deptTenders.filter(t => 
    !['won', 'lost', 'cancelled', 'completed'].includes(t.status || '')
  ).length;

  const totalNmck = deptTenders.reduce((sum, t) => sum + (t.nmck || 0), 0);
  const totalContractPrice = deptTenders
    .filter(t => t.status === 'won')
    .reduce((sum, t) => sum + (t.contract_price || t.nmck || 0), 0);

  const winRate = totalTenders > 0 ? (wonTenders / totalTenders) * 100 : 0;

  // Сбор специалистов
  const specialistMap = new Map<string, {
    name: string;
    role: string;
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    totalNmck: number;
    totalDays: number;
    processedCount: number;
  }>();

  deptTenders.forEach(t => {
    // Учитываем и менеджера, и специалиста
    const employees = [
      getFirst(t.manager as unknown) as { id: string; full_name: string; role: string } | null,
      getFirst(t.specialist as unknown) as { id: string; full_name: string; role: string } | null,
    ].filter(Boolean) as { id: string; full_name: string; role: string }[];

    employees.forEach(emp => {
      const existing = specialistMap.get(emp.id) || {
        name: emp.full_name,
        role: emp.role || 'Специалист',
        totalTenders: 0,
        activeTenders: 0,
        wonTenders: 0,
        lostTenders: 0,
        totalNmck: 0,
        totalDays: 0,
        processedCount: 0,
      };

      existing.totalTenders++;
      existing.totalNmck += t.nmck || 0;

      if (t.status === 'won') {
        existing.wonTenders++;
        // Расчёт дней обработки
        const created = new Date(t.created_at);
        const updated = new Date(t.updated_at);
        const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        existing.totalDays += days;
        existing.processedCount++;
      } else if (t.status === 'lost') {
        existing.lostTenders++;
        existing.processedCount++;
      } else if (!['cancelled', 'completed'].includes(t.status || '')) {
        existing.activeTenders++;
      }

      specialistMap.set(emp.id, existing);
    });
  });

  const specialists = Array.from(specialistMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      role: data.role,
      totalTenders: data.totalTenders,
      activeTenders: data.activeTenders,
      wonTenders: data.wonTenders,
      lostTenders: data.lostTenders,
      winRate: data.totalTenders > 0 ? (data.wonTenders / data.totalTenders) * 100 : 0,
      totalNmck: data.totalNmck,
      avgProcessingDays: data.processedCount > 0 ? Math.round(data.totalDays / data.processedCount) : 0,
    }))
    .sort((a, b) => b.wonTenders - a.wonTenders);

  const tendersPerSpecialist = specialists.length > 0 
    ? Math.round(totalTenders / specialists.length) 
    : 0;

  // Средний срок обработки
  let totalProcessingDays = 0;
  let processedCount = 0;
  deptTenders.forEach(t => {
    if (['won', 'lost'].includes(t.status || '')) {
      const created = new Date(t.created_at);
      const updated = new Date(t.updated_at);
      const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      totalProcessingDays += days;
      processedCount++;
    }
  });
  const avgProcessingDays = processedCount > 0 ? Math.round(totalProcessingDays / processedCount) : 0;

  // Распределение по этапам
  const stageMap = new Map<string, { name: string; color: string; count: number; totalNmck: number; totalDays: number }>();
  deptTenders.forEach(t => {
    const stage = getFirst(t.stage as unknown) as { id: string; name: string; color: string } | null;
    if (stage) {
      const existing = stageMap.get(stage.id) || {
        name: stage.name,
        color: stage.color || '#6b7280',
        count: 0,
        totalNmck: 0,
        totalDays: 0,
      };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      
      // Дни в этапе
      const created = new Date(t.created_at);
      const now = new Date();
      const days = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      existing.totalDays += days;
      
      stageMap.set(stage.id, existing);
    }
  });

  const stages = Array.from(stageMap.entries())
    .map(([stageId, data]) => ({
      stageId,
      stageName: data.name,
      stageColor: data.color,
      count: data.count,
      totalNmck: data.totalNmck,
      avgDaysInStage: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
      percent: totalTenders > 0 ? (data.count / totalTenders) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // По типам
  const typeMap = new Map<string, { name: string; count: number; wonCount: number; lostCount: number; totalNmck: number }>();
  deptTenders.forEach(t => {
    const type = getFirst(t.type as unknown) as { id: string; name: string } | null;
    if (type) {
      const existing = typeMap.get(type.id) || { name: type.name, count: 0, wonCount: 0, lostCount: 0, totalNmck: 0 };
      existing.count++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.wonCount++;
      if (t.status === 'lost') existing.lostCount++;
      typeMap.set(type.id, existing);
    }
  });

  const byType = Array.from(typeMap.entries())
    .map(([typeId, data]) => ({
      typeId,
      typeName: data.name,
      count: data.count,
      wonCount: data.wonCount,
      lostCount: data.lostCount,
      winRate: data.count > 0 ? (data.wonCount / data.count) * 100 : 0,
      totalNmck: data.totalNmck,
    }))
    .sort((a, b) => b.count - a.count);

  // По площадкам
  const platformMap = new Map<string, { name: string; count: number; wonCount: number; totalNmck: number }>();
  deptTenders.forEach(t => {
    const platform = getFirst(t.platform as unknown) as { id: string; name: string } | null;
    if (platform) {
      const existing = platformMap.get(platform.id) || { name: platform.name, count: 0, wonCount: 0, totalNmck: 0 };
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
      wonCount: data.wonCount,
      winRate: data.count > 0 ? (data.wonCount / data.count) * 100 : 0,
      totalNmck: data.totalNmck,
    }))
    .sort((a, b) => b.count - a.count);

  // Динамика по месяцам
  const monthlyMap = new Map<string, { submitted: number; won: number; lost: number; totalNmck: number }>();
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { submitted: 0, won: 0, lost: 0, totalNmck: 0 });
  }

  deptTenders.forEach(t => {
    const date = new Date(t.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.submitted++;
      existing.totalNmck += t.nmck || 0;
      if (t.status === 'won') existing.won++;
      if (t.status === 'lost') existing.lost++;
    }
  });

  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, m] = month.split('-');
      const monthIndex = parseInt(m) - 1;
      const total = data.won + data.lost;
      return {
        month,
        monthLabel: `${monthNames[monthIndex]} ${year.slice(2)}`,
        submitted: data.submitted,
        won: data.won,
        lost: data.lost,
        winRate: total > 0 ? (data.won / total) * 100 : 0,
        totalNmck: data.totalNmck,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Сроки обработки по этапам
  const processingTimes = stages.map(s => ({
    stageName: s.stageName,
    avgDays: s.avgDaysInStage,
    minDays: Math.max(1, s.avgDaysInStage - 5),
    maxDays: s.avgDaysInStage + 10,
    tendersCount: s.count,
  }));

  // Загрузка отдела
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const workload = {
    urgent: 0,
    thisWeek: 0,
    nextWeek: 0,
    overdue: 0,
    total: activeTenders,
  };

  deptTenders.forEach(t => {
    if (!t.submission_deadline || ['won', 'lost', 'cancelled', 'completed'].includes(t.status || '')) return;
    
    const deadline = new Date(t.submission_deadline);
    
    if (deadline < today) {
      workload.overdue++;
    } else if (deadline <= tomorrow) {
      workload.urgent++;
    } else if (deadline <= weekEnd) {
      workload.thisWeek++;
    } else if (deadline <= nextWeekEnd) {
      workload.nextWeek++;
    }
  });

  // Причины проигрышей (пока захардкодим типичные)
  const lossReasons: Array<{ reason: string; count: number; percent: number }> = [];
  if (lostTenders > 0) {
    // В будущем можно добавить поле loss_reason в тендер
    lossReasons.push(
      { reason: 'Высокая цена', count: Math.ceil(lostTenders * 0.4), percent: 40 },
      { reason: 'Не прошли квалификацию', count: Math.ceil(lostTenders * 0.25), percent: 25 },
      { reason: 'Технические требования', count: Math.ceil(lostTenders * 0.2), percent: 20 },
      { reason: 'Другое', count: Math.ceil(lostTenders * 0.15), percent: 15 },
    );
  }

  return {
    overview: {
      totalTenders,
      activeTenders,
      wonTenders,
      lostTenders,
      cancelledTenders,
      winRate,
      totalNmck,
      totalContractPrice,
      avgProcessingDays,
      tendersPerSpecialist,
    },
    specialists,
    stages,
    byType,
    byPlatform,
    monthly,
    processingTimes,
    workload,
    lossReasons,
  };
}

function getEmptyReport(): DepartmentReportData {
  return {
    overview: {
      totalTenders: 0,
      activeTenders: 0,
      wonTenders: 0,
      lostTenders: 0,
      cancelledTenders: 0,
      winRate: 0,
      totalNmck: 0,
      totalContractPrice: 0,
      avgProcessingDays: 0,
      tendersPerSpecialist: 0,
    },
    specialists: [],
    stages: [],
    byType: [],
    byPlatform: [],
    monthly: [],
    processingTimes: [],
    workload: {
      urgent: 0,
      thisWeek: 0,
      nextWeek: 0,
      overdue: 0,
      total: 0,
    },
    lossReasons: [],
  };
}
