import { createRSCClient } from '@/lib/supabase/helpers';
import { logger } from "@/lib/logger";

// Интерфейсы для отчёта по расходам
export interface ExpenseCategory {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TenderExpense {
  id: string;
  purchaseNumber: string;
  customer: string;
  contractPrice: number;
  purchaseCost: number;
  logisticsCost: number;
  otherCosts: number;
  totalCosts: number;
  applicationSecurity: number;
  contractSecurity: number;
  plannedProfit: number;
  profitMargin: number;
  executor: string | null;
  stage: string | null;
  stageCategory: string | null;
  createdAt: string;
}

export interface ExecutorExpenses {
  executor: string;
  tendersCount: number;
  totalCosts: number;
  purchaseCosts: number;
  logisticsCosts: number;
  otherCosts: number;
  securityCosts: number;
  avgCostPerTender: number;
  totalContractValue: number;
  profitMargin: number;
}

export interface MonthlyExpenses {
  month: string;
  monthLabel: string;
  tendersCount: number;
  purchaseCosts: number;
  logisticsCosts: number;
  otherCosts: number;
  securityCosts: number;
  totalCosts: number;
  contractValue: number;
  profitMargin: number;
}

export interface CustomerExpenses {
  customer: string;
  tendersCount: number;
  totalCosts: number;
  contractValue: number;
  avgCostPerTender: number;
  profitMargin: number;
}

export interface ExpensesReportOverview {
  totalCosts: number;
  purchaseCosts: number;
  logisticsCosts: number;
  otherCosts: number;
  securityCosts: number;
  totalContractValue: number;
  totalProfit: number;
  profitMargin: number;
  tendersCount: number;
  avgCostPerTender: number;
  avgProfitPerTender: number;
  costToRevenueRatio: number;
}

export interface ExpensesReportData {
  overview: ExpensesReportOverview;
  categories: ExpenseCategory[];
  tenders: TenderExpense[];
  executors: ExecutorExpenses[];
  customers: CustomerExpenses[];
  monthly: MonthlyExpenses[];
  topExpensiveTenders: TenderExpense[];
  lowMarginTenders: TenderExpense[];
}

export interface ExpensesReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  executorId?: string;
}

// Хелпер для извлечения первого элемента из joined данных
function getFirst<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

function getEmptyReport(): ExpensesReportData {
  return {
    overview: {
      totalCosts: 0,
      purchaseCosts: 0,
      logisticsCosts: 0,
      otherCosts: 0,
      securityCosts: 0,
      totalContractValue: 0,
      totalProfit: 0,
      profitMargin: 0,
      tendersCount: 0,
      avgCostPerTender: 0,
      avgProfitPerTender: 0,
      costToRevenueRatio: 0,
    },
    categories: [],
    tenders: [],
    executors: [],
    customers: [],
    monthly: [],
    topExpensiveTenders: [],
    lowMarginTenders: [],
  };
}

export async function getExpensesReportData(
  params: ExpensesReportParams
): Promise<ExpensesReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo, executorId } = params;

  // Получаем тендеры с расходами
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      customer,
      nmck,
      contract_price,
      our_price,
      purchase_cost,
      logistics_cost,
      other_costs,
      bid_price,
      planned_profit,
      application_security,
      contract_security,
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
  if (executorId) {
    query = query.eq('executor_id', executorId);
  }

  const { data: allTenders, error } = await query;

  if (error) {
    logger.error('Error fetching tenders for expenses report:', error);
    return getEmptyReport();
  }

  if (!allTenders || allTenders.length === 0) {
    return getEmptyReport();
  }

  // Фильтруем только тендеры с расходами (выигранные или на реализации)
  const tenders = allTenders.filter(tender => {
    // Включаем тендеры со статусом won или на этапе реализации
    if (tender.status === 'won') return true;
    const stage = getFirst(tender.stage as unknown) as { category: string } | null;
    if (stage?.category === 'realization') return true;
    // Также включаем тендеры, у которых есть какие-либо расходы
    const hasCosts = (tender.purchase_cost || 0) + (tender.logistics_cost || 0) + 
                     (tender.other_costs || 0) + (tender.application_security || 0) + 
                     (tender.contract_security || 0) > 0;
    return hasCosts;
  });

  if (tenders.length === 0) {
    return getEmptyReport();
  }

  // Агрегация данных
  let totalPurchaseCosts = 0;
  let totalLogisticsCosts = 0;
  let totalOtherCosts = 0;
  let totalSecurityCosts = 0;
  let totalContractValue = 0;
  let totalProfit = 0;

  const executorMap = new Map<string, {
    tendersCount: number;
    totalCosts: number;
    purchaseCosts: number;
    logisticsCosts: number;
    otherCosts: number;
    securityCosts: number;
    totalContractValue: number;
  }>();

  const customerMap = new Map<string, {
    tendersCount: number;
    totalCosts: number;
    contractValue: number;
  }>();

  const monthlyMap = new Map<string, {
    tendersCount: number;
    purchaseCosts: number;
    logisticsCosts: number;
    otherCosts: number;
    securityCosts: number;
    contractValue: number;
  }>();

  const tenderExpenses: TenderExpense[] = [];

  for (const tender of tenders) {
    const purchaseCost = (tender.purchase_cost || 0) / 100;
    const logisticsCost = (tender.logistics_cost || 0) / 100;
    const otherCost = (tender.other_costs || 0) / 100;
    const appSecurity = (tender.application_security || 0) / 100;
    const contractSecurity = (tender.contract_security || 0) / 100;
    const securityCost = appSecurity + contractSecurity;
    const totalCost = purchaseCost + logisticsCost + otherCost;
    const contractPrice = (tender.contract_price || tender.our_price || tender.nmck || 0) / 100;
    const plannedProfit = (tender.planned_profit || 0) / 100;
    const profitMargin = contractPrice > 0 ? ((contractPrice - totalCost) / contractPrice) * 100 : 0;

    totalPurchaseCosts += purchaseCost;
    totalLogisticsCosts += logisticsCost;
    totalOtherCosts += otherCost;
    totalSecurityCosts += securityCost;
    totalContractValue += contractPrice;
    totalProfit += plannedProfit > 0 ? plannedProfit : (contractPrice - totalCost);

    const stage = getFirst(tender.stage as unknown) as { name: string; category: string } | null;
    const executor = getFirst(tender.executor as unknown) as { full_name: string } | null;
    const executorName = executor?.full_name || 'Не назначен';
    const customerName = tender.customer || 'Неизвестный заказчик';

    // Агрегация по исполнителям
    const execData = executorMap.get(executorName) || {
      tendersCount: 0,
      totalCosts: 0,
      purchaseCosts: 0,
      logisticsCosts: 0,
      otherCosts: 0,
      securityCosts: 0,
      totalContractValue: 0,
    };
    execData.tendersCount++;
    execData.totalCosts += totalCost;
    execData.purchaseCosts += purchaseCost;
    execData.logisticsCosts += logisticsCost;
    execData.otherCosts += otherCost;
    execData.securityCosts += securityCost;
    execData.totalContractValue += contractPrice;
    executorMap.set(executorName, execData);

    // Агрегация по заказчикам
    const custData = customerMap.get(customerName) || {
      tendersCount: 0,
      totalCosts: 0,
      contractValue: 0,
    };
    custData.tendersCount++;
    custData.totalCosts += totalCost;
    custData.contractValue += contractPrice;
    customerMap.set(customerName, custData);

    // Агрегация по месяцам
    const createdDate = new Date(tender.created_at);
    const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
    const monthData = monthlyMap.get(monthKey) || {
      tendersCount: 0,
      purchaseCosts: 0,
      logisticsCosts: 0,
      otherCosts: 0,
      securityCosts: 0,
      contractValue: 0,
    };
    monthData.tendersCount++;
    monthData.purchaseCosts += purchaseCost;
    monthData.logisticsCosts += logisticsCost;
    monthData.otherCosts += otherCost;
    monthData.securityCosts += securityCost;
    monthData.contractValue += contractPrice;
    monthlyMap.set(monthKey, monthData);

    // Добавляем в список тендеров
    tenderExpenses.push({
      id: tender.id,
      purchaseNumber: tender.purchase_number,
      customer: customerName,
      contractPrice,
      purchaseCost,
      logisticsCost,
      otherCosts: otherCost,
      totalCosts: totalCost,
      applicationSecurity: appSecurity,
      contractSecurity,
      plannedProfit: plannedProfit > 0 ? plannedProfit : (contractPrice - totalCost),
      profitMargin,
      executor: executor?.full_name || null,
      stage: stage?.name || null,
      stageCategory: stage?.category || null,
      createdAt: tender.created_at,
    });
  }

  const totalCosts = totalPurchaseCosts + totalLogisticsCosts + totalOtherCosts;
  const profitMargin = totalContractValue > 0 ? ((totalContractValue - totalCosts) / totalContractValue) * 100 : 0;
  const costToRevenueRatio = totalContractValue > 0 ? (totalCosts / totalContractValue) * 100 : 0;

  // Формируем категории расходов
  const categories: ExpenseCategory[] = [
    {
      name: 'Закупка',
      amount: totalPurchaseCosts,
      count: tenders.filter(t => (t.purchase_cost || 0) > 0).length,
      percentage: totalCosts > 0 ? (totalPurchaseCosts / totalCosts) * 100 : 0,
    },
    {
      name: 'Логистика',
      amount: totalLogisticsCosts,
      count: tenders.filter(t => (t.logistics_cost || 0) > 0).length,
      percentage: totalCosts > 0 ? (totalLogisticsCosts / totalCosts) * 100 : 0,
    },
    {
      name: 'Прочие расходы',
      amount: totalOtherCosts,
      count: tenders.filter(t => (t.other_costs || 0) > 0).length,
      percentage: totalCosts > 0 ? (totalOtherCosts / totalCosts) * 100 : 0,
    },
    {
      name: 'Обеспечение',
      amount: totalSecurityCosts,
      count: tenders.filter(t => ((t.application_security || 0) + (t.contract_security || 0)) > 0).length,
      percentage: totalCosts > 0 ? (totalSecurityCosts / totalCosts) * 100 : 0,
    },
  ].filter(c => c.amount > 0);

  // Формируем данные по исполнителям
  const executors: ExecutorExpenses[] = Array.from(executorMap.entries())
    .map(([executor, data]) => ({
      executor,
      tendersCount: data.tendersCount,
      totalCosts: data.totalCosts,
      purchaseCosts: data.purchaseCosts,
      logisticsCosts: data.logisticsCosts,
      otherCosts: data.otherCosts,
      securityCosts: data.securityCosts,
      avgCostPerTender: data.tendersCount > 0 ? data.totalCosts / data.tendersCount : 0,
      totalContractValue: data.totalContractValue,
      profitMargin: data.totalContractValue > 0 ? ((data.totalContractValue - data.totalCosts) / data.totalContractValue) * 100 : 0,
    }))
    .sort((a, b) => b.totalCosts - a.totalCosts);

  // Формируем данные по заказчикам
  const customers: CustomerExpenses[] = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      tendersCount: data.tendersCount,
      totalCosts: data.totalCosts,
      contractValue: data.contractValue,
      avgCostPerTender: data.tendersCount > 0 ? data.totalCosts / data.tendersCount : 0,
      profitMargin: data.contractValue > 0 ? ((data.contractValue - data.totalCosts) / data.contractValue) * 100 : 0,
    }))
    .sort((a, b) => b.totalCosts - a.totalCosts);

  // Формируем данные по месяцам
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const monthly: MonthlyExpenses[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      const totalMonthCosts = data.purchaseCosts + data.logisticsCosts + data.otherCosts;
      return {
        month,
        monthLabel: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
        tendersCount: data.tendersCount,
        purchaseCosts: data.purchaseCosts,
        logisticsCosts: data.logisticsCosts,
        otherCosts: data.otherCosts,
        securityCosts: data.securityCosts,
        totalCosts: totalMonthCosts,
        contractValue: data.contractValue,
        profitMargin: data.contractValue > 0 ? ((data.contractValue - totalMonthCosts) / data.contractValue) * 100 : 0,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Топ самых затратных тендеров
  const topExpensiveTenders = [...tenderExpenses]
    .sort((a, b) => b.totalCosts - a.totalCosts)
    .slice(0, 5);

  // Тендеры с низкой маржой (< 20%)
  const lowMarginTenders = [...tenderExpenses]
    .filter(t => t.profitMargin < 20 && t.contractPrice > 0)
    .sort((a, b) => a.profitMargin - b.profitMargin)
    .slice(0, 5);

  return {
    overview: {
      totalCosts,
      purchaseCosts: totalPurchaseCosts,
      logisticsCosts: totalLogisticsCosts,
      otherCosts: totalOtherCosts,
      securityCosts: totalSecurityCosts,
      totalContractValue,
      totalProfit,
      profitMargin,
      tendersCount: tenders.length,
      avgCostPerTender: tenders.length > 0 ? totalCosts / tenders.length : 0,
      avgProfitPerTender: tenders.length > 0 ? totalProfit / tenders.length : 0,
      costToRevenueRatio,
    },
    categories,
    tenders: tenderExpenses.sort((a, b) => b.totalCosts - a.totalCosts),
    executors,
    customers,
    monthly,
    topExpensiveTenders,
    lowMarginTenders,
  };
}
