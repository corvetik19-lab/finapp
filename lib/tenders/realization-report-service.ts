'use server';

import { createRSCClient } from '@/lib/supabase/server';
import { logger } from "@/lib/logger";

export interface RealizationReportData {
  // Общая статистика
  overview: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    problemContracts: number;
    totalContractValue: number;
    completedValue: number;
    remainingValue: number;
    avgCompletionDays: number;
    completionRate: number;
  };

  // Статистика по исполнителям
  executors: Array<{
    id: string;
    name: string;
    role: string;
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    problemContracts: number;
    totalValue: number;
    completionRate: number;
    avgDays: number;
  }>;

  // Распределение по этапам реализации
  stages: Array<{
    stageId: string;
    stageName: string;
    stageColor: string;
    count: number;
    totalValue: number;
    avgDaysInStage: number;
    percent: number;
  }>;

  // По заказчикам
  customers: Array<{
    name: string;
    count: number;
    activeCount: number;
    completedCount: number;
    totalValue: number;
    completedValue: number;
  }>;

  // Динамика по месяцам
  monthly: Array<{
    month: string;
    monthLabel: string;
    started: number;
    completed: number;
    totalValue: number;
    completedValue: number;
    completionRate: number;
  }>;

  // Контракты со скорым дедлайном
  upcomingDeadlines: Array<{
    id: string;
    purchaseNumber: string;
    customer: string;
    deadline: string;
    daysLeft: number;
    value: number;
    executor: string | null;
    stage: string;
    urgency: 'critical' | 'warning' | 'normal';
  }>;

  // Проблемные контракты (просроченные)
  problemContracts: Array<{
    id: string;
    purchaseNumber: string;
    customer: string;
    deadline: string;
    daysOverdue: number;
    value: number;
    executor: string | null;
    stage: string;
  }>;

  // Сроки выполнения
  timing: {
    avgDaysToComplete: number;
    minDays: number;
    maxDays: number;
    onTimeCount: number;
    lateCount: number;
    onTimePercent: number;
  };
}

export interface RealizationReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  executorId?: string;
}

/**
 * Получить данные для отчёта по реализации
 */
export async function getRealizationReportData(
  params: RealizationReportParams
): Promise<RealizationReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Загружаем тендеры с этапами реализации (category = 'realization')
  let tendersQuery = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      status,
      stage_id,
      customer,
      contract_price,
      nmck,
      executor_id,
      submission_deadline,
      results_date,
      created_at,
      updated_at,
      stage:tender_stages(id, name, color, category),
      executor:employees!tenders_executor_id_fkey(id, full_name, role)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    tendersQuery = tendersQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    tendersQuery = tendersQuery.lte('created_at', dateTo + 'T23:59:59');
  }
  if (params.executorId) {
    tendersQuery = tendersQuery.eq('executor_id', params.executorId);
  }

  const { data: tenders, error } = await tendersQuery;

  if (error || !tenders) {
    logger.error('Error fetching tenders for realization report:', error);
    return getEmptyReport();
  }

  // Хелпер для извлечения первого элемента из joined данных
  const getFirst = <T>(data: T | T[] | null): T | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  };

  // Фильтруем тендеры на этапах реализации (выигранные или на этапе реализации)
  const realizationTenders = tenders.filter(t => {
    const stage = getFirst(t.stage as unknown) as { category: string } | null;
    return stage?.category === 'realization' || t.status === 'won';
  });

  const today = new Date();

  // Общая статистика
  const totalContracts = realizationTenders.length;
  const completedContracts = realizationTenders.filter(t => {
    const stage = getFirst(t.stage as unknown) as { name: string } | null;
    return stage?.name?.toLowerCase().includes('заверш') || 
           stage?.name?.toLowerCase().includes('выполн') ||
           stage?.name?.toLowerCase().includes('закрыт');
  }).length;
  
  const problemContracts = realizationTenders.filter(t => {
    if (!t.submission_deadline) return false;
    const deadline = new Date(t.submission_deadline);
    return deadline < today && !['completed', 'closed'].includes(t.status || '');
  }).length;
  
  const activeContracts = totalContracts - completedContracts;

  const totalContractValue = realizationTenders.reduce((sum, t) => 
    sum + (t.contract_price || t.nmck || 0), 0
  );
  
  const completedValue = realizationTenders
    .filter(t => {
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      return stage?.name?.toLowerCase().includes('заверш') || 
             stage?.name?.toLowerCase().includes('выполн');
    })
    .reduce((sum, t) => sum + (t.contract_price || t.nmck || 0), 0);

  const remainingValue = totalContractValue - completedValue;
  const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;

  // Средний срок выполнения
  let totalDays = 0;
  let daysCount = 0;
  realizationTenders.forEach(t => {
    const created = new Date(t.created_at);
    const updated = new Date(t.updated_at);
    const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0) {
      totalDays += days;
      daysCount++;
    }
  });
  const avgCompletionDays = daysCount > 0 ? Math.round(totalDays / daysCount) : 0;

  // Статистика по исполнителям
  const executorMap = new Map<string, {
    name: string;
    role: string;
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    problemContracts: number;
    totalValue: number;
    completedValue: number;
    totalDays: number;
    daysCount: number;
  }>();

  realizationTenders.forEach(t => {
    const executor = getFirst(t.executor as unknown) as { id: string; full_name: string; role: string } | null;
    if (!executor) return;

    const existing = executorMap.get(executor.id) || {
      name: executor.full_name,
      role: executor.role || 'Исполнитель',
      totalContracts: 0,
      activeContracts: 0,
      completedContracts: 0,
      problemContracts: 0,
      totalValue: 0,
      completedValue: 0,
      totalDays: 0,
      daysCount: 0,
    };

    existing.totalContracts++;
    existing.totalValue += t.contract_price || t.nmck || 0;

    const stage = getFirst(t.stage as unknown) as { name: string } | null;
    const isCompleted = stage?.name?.toLowerCase().includes('заверш') || 
                        stage?.name?.toLowerCase().includes('выполн');
    
    if (isCompleted) {
      existing.completedContracts++;
      existing.completedValue += t.contract_price || t.nmck || 0;
    } else {
      existing.activeContracts++;
    }

    if (t.submission_deadline) {
      const deadline = new Date(t.submission_deadline);
      if (deadline < today && !isCompleted) {
        existing.problemContracts++;
      }
    }

    const created = new Date(t.created_at);
    const updated = new Date(t.updated_at);
    const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0 && isCompleted) {
      existing.totalDays += days;
      existing.daysCount++;
    }

    executorMap.set(executor.id, existing);
  });

  const executors = Array.from(executorMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      role: data.role,
      totalContracts: data.totalContracts,
      activeContracts: data.activeContracts,
      completedContracts: data.completedContracts,
      problemContracts: data.problemContracts,
      totalValue: data.totalValue,
      completionRate: data.totalContracts > 0 ? (data.completedContracts / data.totalContracts) * 100 : 0,
      avgDays: data.daysCount > 0 ? Math.round(data.totalDays / data.daysCount) : 0,
    }))
    .sort((a, b) => b.completedContracts - a.completedContracts);

  // Распределение по этапам
  const stageMap = new Map<string, { name: string; color: string; count: number; totalValue: number; totalDays: number }>();
  realizationTenders.forEach(t => {
    const stage = getFirst(t.stage as unknown) as { id: string; name: string; color: string } | null;
    if (stage) {
      const existing = stageMap.get(stage.id) || {
        name: stage.name,
        color: stage.color || '#6b7280',
        count: 0,
        totalValue: 0,
        totalDays: 0,
      };
      existing.count++;
      existing.totalValue += t.contract_price || t.nmck || 0;
      
      const created = new Date(t.created_at);
      const now = new Date();
      existing.totalDays += Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      stageMap.set(stage.id, existing);
    }
  });

  const stages = Array.from(stageMap.entries())
    .map(([stageId, data]) => ({
      stageId,
      stageName: data.name,
      stageColor: data.color,
      count: data.count,
      totalValue: data.totalValue,
      avgDaysInStage: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
      percent: totalContracts > 0 ? (data.count / totalContracts) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // По заказчикам
  const customerMap = new Map<string, { 
    count: number; 
    activeCount: number; 
    completedCount: number; 
    totalValue: number; 
    completedValue: number;
  }>();
  
  realizationTenders.forEach(t => {
    if (!t.customer) return;
    
    const existing = customerMap.get(t.customer) || { 
      count: 0, 
      activeCount: 0, 
      completedCount: 0, 
      totalValue: 0, 
      completedValue: 0 
    };
    
    existing.count++;
    existing.totalValue += t.contract_price || t.nmck || 0;
    
    const stage = getFirst(t.stage as unknown) as { name: string } | null;
    const isCompleted = stage?.name?.toLowerCase().includes('заверш') || 
                        stage?.name?.toLowerCase().includes('выполн');
    
    if (isCompleted) {
      existing.completedCount++;
      existing.completedValue += t.contract_price || t.nmck || 0;
    } else {
      existing.activeCount++;
    }
    
    customerMap.set(t.customer, existing);
  });

  const customers = Array.from(customerMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      activeCount: data.activeCount,
      completedCount: data.completedCount,
      totalValue: data.totalValue,
      completedValue: data.completedValue,
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  // Динамика по месяцам
  const monthlyMap = new Map<string, { started: number; completed: number; totalValue: number; completedValue: number }>();
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { started: 0, completed: 0, totalValue: 0, completedValue: 0 });
  }

  realizationTenders.forEach(t => {
    const createdDate = new Date(t.created_at);
    const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.started++;
      existing.totalValue += t.contract_price || t.nmck || 0;
      
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      const isCompleted = stage?.name?.toLowerCase().includes('заверш') || 
                          stage?.name?.toLowerCase().includes('выполн');
      if (isCompleted) {
        existing.completed++;
        existing.completedValue += t.contract_price || t.nmck || 0;
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
        started: data.started,
        completed: data.completed,
        totalValue: data.totalValue,
        completedValue: data.completedValue,
        completionRate: data.started > 0 ? (data.completed / data.started) * 100 : 0,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Контракты со скорым дедлайном
  const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const upcomingDeadlines = realizationTenders
    .filter(t => {
      if (!t.submission_deadline) return false;
      const deadline = new Date(t.submission_deadline);
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      const isCompleted = stage?.name?.toLowerCase().includes('заверш') || 
                          stage?.name?.toLowerCase().includes('выполн');
      return deadline >= today && deadline <= twoWeeksFromNow && !isCompleted;
    })
    .map(t => {
      const deadline = new Date(t.submission_deadline!);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const executor = getFirst(t.executor as unknown) as { full_name: string } | null;
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      
      let urgency: 'critical' | 'warning' | 'normal' = 'normal';
      if (daysLeft <= 2) urgency = 'critical';
      else if (daysLeft <= 7) urgency = 'warning';
      
      return {
        id: t.id,
        purchaseNumber: t.purchase_number,
        customer: t.customer,
        deadline: t.submission_deadline!,
        daysLeft,
        value: t.contract_price || t.nmck || 0,
        executor: executor?.full_name || null,
        stage: stage?.name || 'Неизвестно',
        urgency,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  // Проблемные контракты (просроченные)
  const problemContractsList = realizationTenders
    .filter(t => {
      if (!t.submission_deadline) return false;
      const deadline = new Date(t.submission_deadline);
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      const isCompleted = stage?.name?.toLowerCase().includes('заверш') || 
                          stage?.name?.toLowerCase().includes('выполн');
      return deadline < today && !isCompleted;
    })
    .map(t => {
      const deadline = new Date(t.submission_deadline!);
      const daysOverdue = Math.ceil((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
      const executor = getFirst(t.executor as unknown) as { full_name: string } | null;
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      
      return {
        id: t.id,
        purchaseNumber: t.purchase_number,
        customer: t.customer,
        deadline: t.submission_deadline!,
        daysOverdue,
        value: t.contract_price || t.nmck || 0,
        executor: executor?.full_name || null,
        stage: stage?.name || 'Неизвестно',
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Сроки выполнения
  const completedTendersWithDays = realizationTenders
    .filter(t => {
      const stage = getFirst(t.stage as unknown) as { name: string } | null;
      return stage?.name?.toLowerCase().includes('заверш') || 
             stage?.name?.toLowerCase().includes('выполн');
    })
    .map(t => {
      const created = new Date(t.created_at);
      const updated = new Date(t.updated_at);
      return Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    })
    .filter(d => d > 0);

  const timing = {
    avgDaysToComplete: completedTendersWithDays.length > 0 
      ? Math.round(completedTendersWithDays.reduce((a, b) => a + b, 0) / completedTendersWithDays.length) 
      : 0,
    minDays: completedTendersWithDays.length > 0 ? Math.min(...completedTendersWithDays) : 0,
    maxDays: completedTendersWithDays.length > 0 ? Math.max(...completedTendersWithDays) : 0,
    onTimeCount: totalContracts - problemContracts,
    lateCount: problemContracts,
    onTimePercent: totalContracts > 0 ? ((totalContracts - problemContracts) / totalContracts) * 100 : 100,
  };

  return {
    overview: {
      totalContracts,
      activeContracts,
      completedContracts,
      problemContracts,
      totalContractValue,
      completedValue,
      remainingValue,
      avgCompletionDays,
      completionRate,
    },
    executors,
    stages,
    customers,
    monthly,
    upcomingDeadlines,
    problemContracts: problemContractsList,
    timing,
  };
}

function getEmptyReport(): RealizationReportData {
  return {
    overview: {
      totalContracts: 0,
      activeContracts: 0,
      completedContracts: 0,
      problemContracts: 0,
      totalContractValue: 0,
      completedValue: 0,
      remainingValue: 0,
      avgCompletionDays: 0,
      completionRate: 0,
    },
    executors: [],
    stages: [],
    customers: [],
    monthly: [],
    upcomingDeadlines: [],
    problemContracts: [],
    timing: {
      avgDaysToComplete: 0,
      minDays: 0,
      maxDays: 0,
      onTimeCount: 0,
      lateCount: 0,
      onTimePercent: 100,
    },
  };
}
