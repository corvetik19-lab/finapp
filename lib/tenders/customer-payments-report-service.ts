import { createRSCClient } from '@/lib/supabase/helpers';
import { logger } from "@/lib/logger";

// Интерфейсы для отчёта по оплатам от заказчиков
export interface CustomerPaymentsReportData {
  overview: {
    totalContractValue: number;      // Общая сумма контрактов
    expectedPayments: number;        // Ожидаемые платежи
    receivedPayments: number;        // Полученные платежи
    pendingPayments: number;         // Ожидающие платежи
    overduePayments: number;         // Просроченные платежи
    paymentRate: number;             // % оплаты
    contractsCount: number;          // Количество контрактов
    customersCount: number;          // Количество заказчиков
    avgPaymentDays: number;          // Среднее время оплаты
  };
  customers: CustomerDebtItem[];     // По заказчикам
  contracts: ContractPaymentItem[];  // По контрактам
  monthly: MonthlyPaymentData[];     // По месяцам
  upcomingPayments: UpcomingPaymentItem[]; // Ожидаемые платежи
  overdueContracts: OverdueContractItem[]; // Просроченные
  paymentStatus: PaymentStatusData;  // Статистика по статусам
}

export interface CustomerDebtItem {
  customer: string;
  contractsCount: number;
  totalValue: number;
  paidValue: number;
  debtValue: number;
  paymentRate: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface ContractPaymentItem {
  id: string;
  purchaseNumber: string;
  customer: string;
  contractValue: number;
  paidAmount: number;
  pendingAmount: number;
  paymentRate: number;
  dueDate: string | null;
  daysToPayment: number;
  status: 'paid' | 'pending' | 'overdue' | 'critical';
  executor: string | null;
}

export interface MonthlyPaymentData {
  month: string;
  monthLabel: string;
  expectedAmount: number;
  receivedAmount: number;
  contractsCount: number;
  paymentRate: number;
}

export interface UpcomingPaymentItem {
  id: string;
  purchaseNumber: string;
  customer: string;
  amount: number;
  dueDate: string;
  daysLeft: number;
  urgency: 'normal' | 'warning' | 'critical';
}

export interface OverdueContractItem {
  id: string;
  purchaseNumber: string;
  customer: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  executor: string | null;
}

export interface PaymentStatusData {
  paid: { count: number; amount: number };
  pending: { count: number; amount: number };
  overdue: { count: number; amount: number };
  critical: { count: number; amount: number };
}

export interface CustomerPaymentsReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

// Хелпер для получения первого элемента из joined данных
function getFirst<T>(data: unknown): T | null {
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as T;
  }
  if (data && typeof data === 'object') {
    return data as T;
  }
  return null;
}

function getEmptyReport(): CustomerPaymentsReportData {
  return {
    overview: {
      totalContractValue: 0,
      expectedPayments: 0,
      receivedPayments: 0,
      pendingPayments: 0,
      overduePayments: 0,
      paymentRate: 0,
      contractsCount: 0,
      customersCount: 0,
      avgPaymentDays: 0,
    },
    customers: [],
    contracts: [],
    monthly: [],
    upcomingPayments: [],
    overdueContracts: [],
    paymentStatus: {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      critical: { count: 0, amount: 0 },
    },
  };
}

export async function getCustomerPaymentsReportData(
  params: CustomerPaymentsReportParams
): Promise<CustomerPaymentsReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Получаем все тендеры компании
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      customer,
      nmck,
      contract_price,
      our_price,
      submission_deadline,
      auction_date,
      results_date,
      payment_term,
      status,
      created_at,
      updated_at,
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
    logger.error('Error fetching tenders for customer payments report:', error);
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
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Агрегация по заказчикам
  const customerMap = new Map<string, {
    contractsCount: number;
    totalValue: number;
    paidValue: number;
    overdueCount: number;
    overdueAmount: number;
  }>();

  // Агрегация по месяцам
  const monthlyMap = new Map<string, {
    expectedAmount: number;
    receivedAmount: number;
    contractsCount: number;
  }>();

  // Статистика по статусам
  const statusData: PaymentStatusData = {
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
    critical: { count: 0, amount: 0 },
  };

  const contracts: ContractPaymentItem[] = [];
  const upcomingPayments: UpcomingPaymentItem[] = [];
  const overdueContracts: OverdueContractItem[] = [];

  let totalContractValue = 0;
  let receivedPayments = 0;
  let pendingPayments = 0;
  let overduePayments = 0;
  let totalPaymentDays = 0;
  let paymentDaysCount = 0;

  for (const tender of tenders) {
    const stage = getFirst(tender.stage as unknown) as { id: string; name: string; category: string; color: string } | null;
    const executor = getFirst(tender.executor as unknown) as { id: string; full_name: string } | null;

    // Сумма контракта (в копейках -> в рублях)
    const contractValue = (tender.contract_price || tender.our_price || tender.nmck || 0) / 100;
    totalContractValue += contractValue;

    // Определяем статус оплаты на основе этапа
    // Если этап содержит "заверш" или "оплач" - считаем оплаченным
    const stageName = stage?.name?.toLowerCase() || '';
    const isPaid = stageName.includes('заверш') || 
                   stageName.includes('оплач') || 
                   stageName.includes('закрыт') ||
                   stageName.includes('выполн');

    // Расчётная дата оплаты (30 дней от results_date или auction_date)
    let dueDate: Date | null = null;
    const dueDateStr = tender.results_date || tender.auction_date || tender.submission_deadline;
    if (dueDateStr) {
      dueDate = new Date(dueDateStr);
      // Добавляем срок оплаты (по умолчанию 30 дней)
      const paymentDays = tender.payment_term ? parseInt(tender.payment_term) || 30 : 30;
      dueDate.setDate(dueDate.getDate() + paymentDays);
    }

    const daysToPayment = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Определяем статус
    let status: 'paid' | 'pending' | 'overdue' | 'critical';
    let paidAmount = 0;
    let pendingAmount = 0;

    if (isPaid) {
      status = 'paid';
      paidAmount = contractValue;
      receivedPayments += contractValue;
      statusData.paid.count++;
      statusData.paid.amount += contractValue;
      
      // Расчёт среднего времени оплаты
      if (tender.results_date && tender.updated_at) {
        const resultsDate = new Date(tender.results_date);
        const paidDate = new Date(tender.updated_at);
        const days = Math.ceil((paidDate.getTime() - resultsDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 0 && days < 365) {
          totalPaymentDays += days;
          paymentDaysCount++;
        }
      }
    } else if (dueDate && dueDate < today) {
      const daysOverdue = Math.abs(daysToPayment);
      if (daysOverdue > 30) {
        status = 'critical';
        statusData.critical.count++;
        statusData.critical.amount += contractValue;
      } else {
        status = 'overdue';
        statusData.overdue.count++;
        statusData.overdue.amount += contractValue;
      }
      pendingAmount = contractValue;
      overduePayments += contractValue;

      // Добавляем в просроченные
      overdueContracts.push({
        id: tender.id,
        purchaseNumber: tender.purchase_number,
        customer: tender.customer,
        amount: contractValue,
        dueDate: dueDate.toISOString().split('T')[0],
        daysOverdue: daysOverdue,
        executor: executor?.full_name || null,
      });
    } else {
      status = 'pending';
      pendingAmount = contractValue;
      pendingPayments += contractValue;
      statusData.pending.count++;
      statusData.pending.amount += contractValue;

      // Добавляем в ожидаемые, если дедлайн в ближайшие 30 дней
      if (dueDate && dueDate <= thirtyDaysFromNow) {
        let urgency: 'normal' | 'warning' | 'critical' = 'normal';
        if (daysToPayment <= 7) urgency = 'critical';
        else if (daysToPayment <= 14) urgency = 'warning';

        upcomingPayments.push({
          id: tender.id,
          purchaseNumber: tender.purchase_number,
          customer: tender.customer,
          amount: contractValue,
          dueDate: dueDate.toISOString().split('T')[0],
          daysLeft: daysToPayment,
          urgency,
        });
      }
    }

    // Добавляем контракт
    contracts.push({
      id: tender.id,
      purchaseNumber: tender.purchase_number,
      customer: tender.customer,
      contractValue,
      paidAmount,
      pendingAmount,
      paymentRate: contractValue > 0 ? (paidAmount / contractValue) * 100 : 0,
      dueDate: dueDate?.toISOString().split('T')[0] || null,
      daysToPayment,
      status,
      executor: executor?.full_name || null,
    });

    // Агрегация по заказчикам
    const customerData = customerMap.get(tender.customer) || {
      contractsCount: 0,
      totalValue: 0,
      paidValue: 0,
      overdueCount: 0,
      overdueAmount: 0,
    };
    customerData.contractsCount++;
    customerData.totalValue += contractValue;
    customerData.paidValue += paidAmount;
    if (status === 'overdue' || status === 'critical') {
      customerData.overdueCount++;
      customerData.overdueAmount += pendingAmount;
    }
    customerMap.set(tender.customer, customerData);

    // Агрегация по месяцам
    const monthKey = tender.created_at.substring(0, 7);
    const monthData = monthlyMap.get(monthKey) || {
      expectedAmount: 0,
      receivedAmount: 0,
      contractsCount: 0,
    };
    monthData.expectedAmount += contractValue;
    monthData.receivedAmount += paidAmount;
    monthData.contractsCount++;
    monthlyMap.set(monthKey, monthData);
  }

  // Преобразуем данные по заказчикам
  const customers: CustomerDebtItem[] = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      contractsCount: data.contractsCount,
      totalValue: data.totalValue,
      paidValue: data.paidValue,
      debtValue: data.totalValue - data.paidValue,
      paymentRate: data.totalValue > 0 ? (data.paidValue / data.totalValue) * 100 : 0,
      overdueCount: data.overdueCount,
      overdueAmount: data.overdueAmount,
    }))
    .sort((a, b) => b.debtValue - a.debtValue);

  // Преобразуем данные по месяцам
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthly: MonthlyPaymentData[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      return {
        month,
        monthLabel: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
        expectedAmount: data.expectedAmount,
        receivedAmount: data.receivedAmount,
        contractsCount: data.contractsCount,
        paymentRate: data.expectedAmount > 0 ? (data.receivedAmount / data.expectedAmount) * 100 : 0,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Сортируем контракты по статусу и сумме
  contracts.sort((a, b) => {
    const statusOrder = { critical: 0, overdue: 1, pending: 2, paid: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.pendingAmount - a.pendingAmount;
  });

  // Сортируем ожидаемые платежи по срочности
  upcomingPayments.sort((a, b) => a.daysLeft - b.daysLeft);

  // Сортируем просроченные по количеству дней
  overdueContracts.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const avgPaymentDays = paymentDaysCount > 0 ? Math.round(totalPaymentDays / paymentDaysCount) : 0;

  return {
    overview: {
      totalContractValue,
      expectedPayments: totalContractValue,
      receivedPayments,
      pendingPayments,
      overduePayments,
      paymentRate: totalContractValue > 0 ? (receivedPayments / totalContractValue) * 100 : 0,
      contractsCount: tenders.length,
      customersCount: customerMap.size,
      avgPaymentDays,
    },
    customers,
    contracts,
    monthly,
    upcomingPayments,
    overdueContracts,
    paymentStatus: statusData,
  };
}
