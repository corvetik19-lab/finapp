import { createRSCClient } from '@/lib/supabase/helpers';
import { logger } from "@/lib/logger";

// Интерфейсы для отчёта по дебиторской задолженности
export interface DebtorInfo {
  id: string;
  customer: string;
  purchaseNumber: string;
  contractPrice: number;
  paidAmount: number;
  debtAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  status: 'current' | 'warning' | 'overdue' | 'critical';
  executor: string | null;
  stage: string | null;
}

export interface DebtorSummary {
  customer: string;
  contractsCount: number;
  totalDebt: number;
  overdueDebt: number;
  avgDaysOverdue: number;
}

export interface DebtsReportOverview {
  totalDebt: number;
  currentDebt: number;
  warningDebt: number;
  overdueDebt: number;
  criticalDebt: number;
  debtorsCount: number;
  contractsCount: number;
  avgDaysOverdue: number;
  collectionRate: number;
}

export interface DebtsReportData {
  overview: DebtsReportOverview;
  debtors: DebtorInfo[];
  byCustomer: DebtorSummary[];
  criticalDebtors: DebtorInfo[];
  upcomingPayments: DebtorInfo[];
}

export interface DebtsReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
}

// Хелпер для извлечения первого элемента из joined данных
function getFirst<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

function getEmptyReport(): DebtsReportData {
  return {
    overview: {
      totalDebt: 0,
      currentDebt: 0,
      warningDebt: 0,
      overdueDebt: 0,
      criticalDebt: 0,
      debtorsCount: 0,
      contractsCount: 0,
      avgDaysOverdue: 0,
      collectionRate: 0,
    },
    debtors: [],
    byCustomer: [],
    criticalDebtors: [],
    upcomingPayments: [],
  };
}

export async function getDebtsReportData(
  params: DebtsReportParams
): Promise<DebtsReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Получаем тендеры с задолженностью
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      customer,
      nmck,
      contract_price,
      our_price,
      payment_term,
      results_date,
      status,
      created_at,
      stage:tender_stages!tenders_stage_id_fkey(id, name, category, color),
      executor:employees!tenders_executor_id_fkey(id, full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data: allTenders, error } = await query;

  if (error) {
    logger.error('Error fetching tenders for debts report:', error);
    return getEmptyReport();
  }

  if (!allTenders || allTenders.length === 0) {
    return getEmptyReport();
  }

  // Фильтруем только выигранные или на этапе реализации
  const tenders = allTenders.filter(tender => {
    if (tender.status === 'won') return true;
    const stage = getFirst(tender.stage as unknown) as { category: string } | null;
    return stage?.category === 'realization';
  });

  if (tenders.length === 0) {
    return getEmptyReport();
  }

  const today = new Date();
  const debtors: DebtorInfo[] = [];
  const customerMap = new Map<string, { contractsCount: number; totalDebt: number; overdueDebt: number; daysOverdue: number[] }>();

  let totalDebt = 0;
  let currentDebt = 0;
  let warningDebt = 0;
  let overdueDebt = 0;
  let criticalDebt = 0;
  let totalPaid = 0;
  let totalContract = 0;
  const allDaysOverdue: number[] = [];

  for (const tender of tenders) {
    const contractPrice = (tender.contract_price || tender.our_price || tender.nmck || 0) / 100;
    
    // Симулируем оплаченную сумму на основе этапа
    const stage = getFirst(tender.stage as unknown) as { name: string; category: string } | null;
    const stageName = stage?.name?.toLowerCase() || '';
    
    let paidPercent = 0;
    if (stageName.includes('оплачен') || stageName.includes('завершен') || stageName.includes('закрыт')) {
      paidPercent = 100;
    } else if (stageName.includes('частич')) {
      paidPercent = 50;
    } else if (stageName.includes('реализ') || stageName.includes('исполн')) {
      paidPercent = 30;
    }
    
    const paidAmount = contractPrice * (paidPercent / 100);
    const debtAmount = contractPrice - paidAmount;

    if (debtAmount <= 0) continue; // Нет задолженности

    totalContract += contractPrice;
    totalPaid += paidAmount;
    totalDebt += debtAmount;

    // Рассчитываем срок оплаты
    let dueDate: Date | null = null;
    if (tender.payment_term) {
      const days = parseInt(tender.payment_term);
      if (!isNaN(days) && tender.results_date) {
        dueDate = new Date(tender.results_date);
        dueDate.setDate(dueDate.getDate() + days);
      }
    }

    // Определяем просрочку
    let daysOverdue = 0;
    let status: DebtorInfo['status'] = 'current';

    if (dueDate) {
      const diffTime = today.getTime() - dueDate.getTime();
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysOverdue > 60) {
        status = 'critical';
        criticalDebt += debtAmount;
      } else if (daysOverdue > 30) {
        status = 'overdue';
        overdueDebt += debtAmount;
      } else if (daysOverdue > 0) {
        status = 'warning';
        warningDebt += debtAmount;
      } else {
        currentDebt += debtAmount;
      }

      if (daysOverdue > 0) {
        allDaysOverdue.push(daysOverdue);
      }
    } else {
      currentDebt += debtAmount;
    }

    const executor = getFirst(tender.executor as unknown) as { full_name: string } | null;
    const customerName = tender.customer || 'Неизвестный заказчик';

    // Агрегация по заказчикам
    const custData = customerMap.get(customerName) || { contractsCount: 0, totalDebt: 0, overdueDebt: 0, daysOverdue: [] };
    custData.contractsCount++;
    custData.totalDebt += debtAmount;
    if (daysOverdue > 0) {
      custData.overdueDebt += debtAmount;
      custData.daysOverdue.push(daysOverdue);
    }
    customerMap.set(customerName, custData);

    debtors.push({
      id: tender.id,
      customer: customerName,
      purchaseNumber: tender.purchase_number,
      contractPrice,
      paidAmount,
      debtAmount,
      dueDate: dueDate?.toISOString().split('T')[0] || null,
      daysOverdue: Math.max(0, daysOverdue),
      status,
      executor: executor?.full_name || null,
      stage: stage?.name || null,
    });
  }

  // Формируем данные по заказчикам
  const byCustomer: DebtorSummary[] = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      contractsCount: data.contractsCount,
      totalDebt: data.totalDebt,
      overdueDebt: data.overdueDebt,
      avgDaysOverdue: data.daysOverdue.length > 0 
        ? Math.round(data.daysOverdue.reduce((a, b) => a + b, 0) / data.daysOverdue.length)
        : 0,
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);

  // Критические должники
  const criticalDebtors = debtors
    .filter(d => d.status === 'critical' || d.status === 'overdue')
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 10);

  // Предстоящие платежи (в ближайшие 30 дней)
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingPayments = debtors
    .filter(d => {
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate);
      return due >= today && due <= thirtyDaysFromNow;
    })
    .sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 10);

  const avgDaysOverdue = allDaysOverdue.length > 0
    ? Math.round(allDaysOverdue.reduce((a, b) => a + b, 0) / allDaysOverdue.length)
    : 0;

  const collectionRate = totalContract > 0 ? (totalPaid / totalContract) * 100 : 0;

  return {
    overview: {
      totalDebt,
      currentDebt,
      warningDebt,
      overdueDebt,
      criticalDebt,
      debtorsCount: customerMap.size,
      contractsCount: debtors.length,
      avgDaysOverdue,
      collectionRate,
    },
    debtors: debtors.sort((a, b) => b.debtAmount - a.debtAmount),
    byCustomer,
    criticalDebtors,
    upcomingPayments,
  };
}
