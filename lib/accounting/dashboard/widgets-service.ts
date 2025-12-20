"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  DashboardFilters,
  FinancialOverviewData,
  CashFlowData,
  ReceivablesData,
  PayablesData,
  TenderProfitabilityData,
  TaxCalendarData,
  UnpaidInvoicesData,
  TrendPoint,
  AgingBucket,
  DebtorInfo,
  CreditorInfo,
  DailyFlowPoint,
} from "./types";

function getDateRange(filters: DashboardFilters): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (filters.period) {
    case 'week': {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    }
    case 'year': {
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case 'custom': {
      startDate = filters.startDate ? new Date(filters.startDate) : new Date(now.getFullYear(), 0, 1);
      endDate = filters.endDate ? new Date(filters.endDate) : now;
      break;
    }
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export async function getFinancialOverview(filters: DashboardFilters): Promise<FinancialOverviewData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyFinancialOverview();
  }

  const { startDate, endDate } = getDateRange(filters);

  // Получаем доходы (оплаченные документы)
  const { data: incomeData } = await supabase
    .from('accounting_documents')
    .select('total')
    .eq('company_id', companyId)
    .eq('status', 'paid')
    .in('document_type', ['invoice', 'act', 'upd'])
    .gte('document_date', startDate)
    .lte('document_date', endDate)
    .is('deleted_at', null);

  const totalIncome = (incomeData || []).reduce((sum, d) => sum + (d.total || 0), 0);

  // Получаем расходы из КУДиР
  const { data: expenseData } = await supabase
    .from('kudir_entries')
    .select('expense')
    .eq('company_id', companyId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  const totalExpense = (expenseData || []).reduce((sum, e) => sum + (e.expense || 0), 0);

  const profit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  // Получаем баланс по банковским счетам
  const { data: bankAccounts } = await supabase
    .from('accounting_bank_accounts')
    .select('current_balance')
    .eq('company_id', companyId)
    .eq('is_active', true);

  const balance = (bankAccounts || []).reduce((sum, a) => sum + (a.current_balance || 0), 0);

  // Тренд по дням
  const trend = await getFinancialTrend(companyId, startDate, endDate);

  // Изменения к предыдущему периоду (упрощённо)
  const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
  const prevStartDate = new Date(new Date(startDate).getTime() - periodLength).toISOString().split('T')[0];
  const prevEndDate = new Date(new Date(startDate).getTime() - 1).toISOString().split('T')[0];

  const { data: prevIncomeData } = await supabase
    .from('accounting_documents')
    .select('total')
    .eq('company_id', companyId)
    .eq('status', 'paid')
    .in('document_type', ['invoice', 'act', 'upd'])
    .gte('document_date', prevStartDate)
    .lte('document_date', prevEndDate)
    .is('deleted_at', null);

  const prevTotalIncome = (prevIncomeData || []).reduce((sum, d) => sum + (d.total || 0), 0);
  const incomeChange = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpense,
    profit,
    profitMargin,
    balance,
    incomeChange,
    expenseChange: 0,
    profitChange: 0,
    trend,
  };
}

async function getFinancialTrend(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<TrendPoint[]> {
  const supabase = await createRSCClient();
  
  // Получаем данные по дням
  const { data: documents } = await supabase
    .from('accounting_documents')
    .select('document_date, total, status')
    .eq('company_id', companyId)
    .eq('status', 'paid')
    .gte('document_date', startDate)
    .lte('document_date', endDate)
    .is('deleted_at', null);

  const { data: expenses } = await supabase
    .from('kudir_entries')
    .select('entry_date, expense')
    .eq('company_id', companyId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  // Группируем по датам
  const trendMap = new Map<string, { income: number; expense: number }>();

  for (const doc of documents || []) {
    const date = doc.document_date;
    const current = trendMap.get(date) || { income: 0, expense: 0 };
    current.income += doc.total || 0;
    trendMap.set(date, current);
  }

  for (const exp of expenses || []) {
    const date = exp.entry_date;
    const current = trendMap.get(date) || { income: 0, expense: 0 };
    current.expense += exp.expense || 0;
    trendMap.set(date, current);
  }

  // Сортируем и возвращаем
  const trend: TrendPoint[] = Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      income: data.income,
      expense: data.expense,
      profit: data.income - data.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trend;
}

export async function getCashFlowData(filters: DashboardFilters): Promise<CashFlowData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyCashFlow();
  }

  const { startDate, endDate } = getDateRange(filters);

  // Получаем банковские транзакции
  const { data: transactions } = await supabase
    .from('accounting_bank_transactions')
    .select('*')
    .eq('company_id', companyId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  const inflows = (transactions || []).filter(t => t.amount > 0);
  const outflows = (transactions || []).filter(t => t.amount < 0);

  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = Math.abs(outflows.reduce((sum, t) => sum + t.amount, 0));

  // Получаем начальный баланс
  const { data: bankAccounts } = await supabase
    .from('accounting_bank_accounts')
    .select('current_balance')
    .eq('company_id', companyId)
    .eq('is_active', true);

  const closingBalance = (bankAccounts || []).reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const openingBalance = closingBalance - totalInflow + totalOutflow;

  // Группируем по дням
  const dailyMap = new Map<string, { inflow: number; outflow: number }>();
  for (const t of transactions || []) {
    const date = t.transaction_date;
    const current = dailyMap.get(date) || { inflow: 0, outflow: 0 };
    if (t.amount > 0) {
      current.inflow += t.amount;
    } else {
      current.outflow += Math.abs(t.amount);
    }
    dailyMap.set(date, current);
  }

  let runningBalance = openingBalance;
  const dailyFlow: DailyFlowPoint[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => {
      runningBalance += data.inflow - data.outflow;
      return {
        date,
        inflow: data.inflow,
        outflow: data.outflow,
        balance: runningBalance,
      };
    });

  return {
    openingBalance,
    closingBalance,
    totalInflow,
    totalOutflow,
    netFlow: totalInflow - totalOutflow,
    inflowByCategory: [],
    outflowByCategory: [],
    dailyFlow,
  };
}

export async function getReceivablesData(): Promise<ReceivablesData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyReceivables();
  }

  const today = new Date().toISOString().split('T')[0];

  // Получаем неоплаченные счета (выставленные нами)
  const { data: invoices } = await supabase
    .from('accounting_documents')
    .select(`
      id,
      document_number,
      document_date,
      total,
      paid_amount,
      counterparty_id,
      counterparty_name
    `)
    .eq('company_id', companyId)
    .in('document_type', ['invoice', 'act', 'upd'])
    .in('status', ['issued', 'partial'])
    .is('deleted_at', null);

  const unpaidInvoices = (invoices || []).map(inv => {
    const remaining = (inv.total || 0) - (inv.paid_amount || 0);
    const daysSinceIssue = Math.floor(
      (new Date(today).getTime() - new Date(inv.document_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...inv,
      remaining,
      daysSinceIssue,
      isOverdue: daysSinceIssue > 30, // Считаем просроченным после 30 дней
    };
  });

  const totalAmount = unpaidInvoices.reduce((sum, i) => sum + i.remaining, 0);
  const overdueInvoices = unpaidInvoices.filter(i => i.isOverdue);
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.remaining, 0);

  // Группируем по возрасту
  const byAge: AgingBucket[] = [
    { label: 'До 30 дней', amount: 0, count: 0, percent: 0 },
    { label: '30-60 дней', amount: 0, count: 0, percent: 0 },
    { label: '60-90 дней', amount: 0, count: 0, percent: 0 },
    { label: 'Более 90 дней', amount: 0, count: 0, percent: 0 },
  ];

  for (const inv of unpaidInvoices) {
    if (inv.daysSinceIssue <= 30) {
      byAge[0].amount += inv.remaining;
      byAge[0].count++;
    } else if (inv.daysSinceIssue <= 60) {
      byAge[1].amount += inv.remaining;
      byAge[1].count++;
    } else if (inv.daysSinceIssue <= 90) {
      byAge[2].amount += inv.remaining;
      byAge[2].count++;
    } else {
      byAge[3].amount += inv.remaining;
      byAge[3].count++;
    }
  }

  // Вычисляем проценты
  for (const bucket of byAge) {
    bucket.percent = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
  }

  // Топ должников
  const debtorMap = new Map<string, DebtorInfo>();
  for (const inv of unpaidInvoices) {
    const key = inv.counterparty_id || inv.counterparty_name;
    const existing = debtorMap.get(key);
    if (existing) {
      existing.amount += inv.remaining;
      if (inv.isOverdue) {
        existing.overdueAmount += inv.remaining;
        existing.overdueDays = Math.max(existing.overdueDays, inv.daysSinceIssue - 30);
      }
      existing.invoicesCount++;
      if (inv.document_date < existing.oldestInvoiceDate) {
        existing.oldestInvoiceDate = inv.document_date;
      }
    } else {
      debtorMap.set(key, {
        counterpartyId: inv.counterparty_id || '',
        counterpartyName: inv.counterparty_name || 'Неизвестный',
        amount: inv.remaining,
        overdueAmount: inv.isOverdue ? inv.remaining : 0,
        overdueDays: inv.isOverdue ? inv.daysSinceIssue - 30 : 0,
        oldestInvoiceDate: inv.document_date,
        invoicesCount: 1,
      });
    }
  }

  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    totalAmount,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    byAge,
    topDebtors,
  };
}

export async function getPayablesData(): Promise<PayablesData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyPayables();
  }

  // Получаем входящие неоплаченные счета (от поставщиков)
  const { data: invoices } = await supabase
    .from('accounting_documents')
    .select(`
      id,
      document_number,
      document_date,
      total,
      paid_amount,
      counterparty_id,
      counterparty_name
    `)
    .eq('company_id', companyId)
    .eq('document_type', 'invoice_factura')
    .in('status', ['issued', 'partial'])
    .is('deleted_at', null);

  const today = new Date().toISOString().split('T')[0];

  const unpaidInvoices = (invoices || []).map(inv => {
    const remaining = (inv.total || 0) - (inv.paid_amount || 0);
    const daysSinceIssue = Math.floor(
      (new Date(today).getTime() - new Date(inv.document_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...inv,
      remaining,
      daysSinceIssue,
      isOverdue: daysSinceIssue > 30,
    };
  });

  const totalAmount = unpaidInvoices.reduce((sum, i) => sum + i.remaining, 0);
  const overdueInvoices = unpaidInvoices.filter(i => i.isOverdue);
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.remaining, 0);

  const byAge: AgingBucket[] = [
    { label: 'До 30 дней', amount: 0, count: 0, percent: 0 },
    { label: '30-60 дней', amount: 0, count: 0, percent: 0 },
    { label: '60-90 дней', amount: 0, count: 0, percent: 0 },
    { label: 'Более 90 дней', amount: 0, count: 0, percent: 0 },
  ];

  for (const inv of unpaidInvoices) {
    if (inv.daysSinceIssue <= 30) {
      byAge[0].amount += inv.remaining;
      byAge[0].count++;
    } else if (inv.daysSinceIssue <= 60) {
      byAge[1].amount += inv.remaining;
      byAge[1].count++;
    } else if (inv.daysSinceIssue <= 90) {
      byAge[2].amount += inv.remaining;
      byAge[2].count++;
    } else {
      byAge[3].amount += inv.remaining;
      byAge[3].count++;
    }
  }

  for (const bucket of byAge) {
    bucket.percent = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
  }

  const creditorMap = new Map<string, CreditorInfo>();
  for (const inv of unpaidInvoices) {
    const key = inv.counterparty_id || inv.counterparty_name;
    const existing = creditorMap.get(key);
    if (existing) {
      existing.amount += inv.remaining;
      if (inv.isOverdue) {
        existing.overdueAmount += inv.remaining;
        existing.overdueDays = Math.max(existing.overdueDays, inv.daysSinceIssue - 30);
      }
      existing.invoicesCount++;
      if (inv.document_date < existing.oldestInvoiceDate) {
        existing.oldestInvoiceDate = inv.document_date;
      }
    } else {
      creditorMap.set(key, {
        counterpartyId: inv.counterparty_id || '',
        counterpartyName: inv.counterparty_name || 'Неизвестный',
        amount: inv.remaining,
        overdueAmount: inv.isOverdue ? inv.remaining : 0,
        overdueDays: inv.isOverdue ? inv.daysSinceIssue - 30 : 0,
        oldestInvoiceDate: inv.document_date,
        invoicesCount: 1,
      });
    }
  }

  const topCreditors = Array.from(creditorMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    totalAmount,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    byAge,
    topCreditors,
  };
}

export async function getTenderProfitabilityData(): Promise<TenderProfitabilityData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyTenderProfitability();
  }

  // Получаем активные тендеры с финансовыми данными
  const { data: tenders } = await supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      subject,
      customer,
      contract_price,
      status,
      stage:tender_stages(name)
    `)
    .eq('company_id', companyId)
    .in('status', ['active', 'contract', 'execution'])
    .is('deleted_at', null)
    .limit(20);

  const tenderInfos: TenderProfitabilityData['tenders'] = [];
  let totalContractValue = 0;
  let totalExpenses = 0;

  for (const tender of tenders || []) {
    const contractValue = tender.contract_price || 0;
    totalContractValue += contractValue;

    // Получаем расходы по тендеру из КУДиР
    const { data: expenses } = await supabase
      .from('kudir_entries')
      .select('expense')
      .eq('company_id', companyId)
      .eq('tender_id', tender.id);

    const tenderExpenses = (expenses || []).reduce((sum, e) => sum + (e.expense || 0), 0);
    totalExpenses += tenderExpenses;

    const profit = contractValue - tenderExpenses;
    const margin = contractValue > 0 ? (profit / contractValue) * 100 : 0;

    tenderInfos.push({
      tenderId: tender.id,
      purchaseNumber: tender.purchase_number || '',
      subject: tender.subject || '',
      customer: tender.customer || '',
      contractValue,
      expenses: tenderExpenses,
      profit,
      margin,
      status: tender.status || '',
      stage: Array.isArray(tender.stage) ? tender.stage[0]?.name || '' : (tender.stage as { name: string } | null)?.name || '',
    });
  }

  const totalProfit = totalContractValue - totalExpenses;
  const averageMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

  return {
    activeTendersCount: (tenders || []).length,
    totalContractValue,
    totalExpenses,
    totalProfit,
    averageMargin,
    tenders: tenderInfos.sort((a, b) => b.contractValue - a.contractValue),
  };
}

export async function getTaxCalendarData(): Promise<TaxCalendarData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyTaxCalendar();
  }

  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  const { data: payments } = await supabase
    .from('tax_payments')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['pending', 'overdue'])
    .lte('due_date', thirtyDaysLater.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  const upcomingPayments: TaxCalendarData['upcomingPayments'] = [];
  const overduePayments: TaxCalendarData['overduePayments'] = [];

  for (const p of payments || []) {
    const daysUntilDue = Math.floor(
      (new Date(p.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const paymentInfo = {
      id: p.id,
      taxType: p.tax_type,
      taxName: p.tax_name,
      amount: p.calculated_amount - p.paid_amount,
      dueDate: p.due_date,
      daysUntilDue,
      status: daysUntilDue < 0 ? 'overdue' as const : 'pending' as const,
      periodYear: p.period_year,
      periodQuarter: p.period_quarter,
      periodMonth: p.period_month,
    };

    if (daysUntilDue < 0) {
      overduePayments.push(paymentInfo);
    } else {
      upcomingPayments.push(paymentInfo);
    }
  }

  return {
    upcomingPayments,
    overduePayments,
    totalUpcoming: upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
    totalOverdue: overduePayments.reduce((sum, p) => sum + p.amount, 0),
    nextPaymentDate: upcomingPayments[0]?.dueDate || null,
  };
}

export async function getUnpaidInvoicesData(): Promise<UnpaidInvoicesData> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return getEmptyUnpaidInvoices();
  }

  const { data: documents } = await supabase
    .from('accounting_documents')
    .select(`
      id,
      document_number,
      document_date,
      document_type,
      total,
      paid_amount,
      status,
      counterparty_name,
      tender_id,
      tender:tenders(purchase_number)
    `)
    .eq('company_id', companyId)
    .in('document_type', ['invoice', 'act', 'upd'])
    .in('status', ['draft', 'issued', 'partial'])
    .is('deleted_at', null)
    .order('document_date', { ascending: false })
    .limit(50);

  const today = new Date();
  const invoices: UnpaidInvoicesData['invoices'] = [];

  for (const doc of documents || []) {
    const remainingAmount = (doc.total || 0) - (doc.paid_amount || 0);
    const daysSinceIssue = Math.floor(
      (today.getTime() - new Date(doc.document_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const overdueDays = Math.max(0, daysSinceIssue - 30);

    invoices.push({
      id: doc.id,
      documentNumber: doc.document_number,
      documentDate: doc.document_date,
      counterpartyName: doc.counterparty_name || '',
      amount: doc.total || 0,
      paidAmount: doc.paid_amount || 0,
      remainingAmount,
      overdueDays,
      tenderId: doc.tender_id || undefined,
      tenderNumber: Array.isArray(doc.tender) ? doc.tender[0]?.purchase_number : (doc.tender as { purchase_number: string } | null)?.purchase_number,
    });
  }

  const totalAmount = invoices.reduce((sum, i) => sum + i.remainingAmount, 0);
  const overdueInvoices = invoices.filter(i => i.overdueDays > 0);
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.remainingAmount, 0);

  // Группировка по статусу
  const byStatus = [
    { status: 'draft', label: 'Черновики', count: 0, amount: 0 },
    { status: 'issued', label: 'Выставленные', count: 0, amount: 0 },
    { status: 'partial', label: 'Частично оплачены', count: 0, amount: 0 },
  ];

  for (const doc of documents || []) {
    const remaining = (doc.total || 0) - (doc.paid_amount || 0);
    const statusGroup = byStatus.find(s => s.status === doc.status);
    if (statusGroup) {
      statusGroup.count++;
      statusGroup.amount += remaining;
    }
  }

  return {
    totalCount: invoices.length,
    totalAmount,
    overdueCount: overdueInvoices.length,
    overdueAmount,
    byStatus,
    invoices,
  };
}

// Пустые данные для случаев когда нет companyId
function getEmptyFinancialOverview(): FinancialOverviewData {
  return {
    totalIncome: 0,
    totalExpense: 0,
    profit: 0,
    profitMargin: 0,
    balance: 0,
    incomeChange: 0,
    expenseChange: 0,
    profitChange: 0,
    trend: [],
  };
}

function getEmptyCashFlow(): CashFlowData {
  return {
    openingBalance: 0,
    closingBalance: 0,
    totalInflow: 0,
    totalOutflow: 0,
    netFlow: 0,
    inflowByCategory: [],
    outflowByCategory: [],
    dailyFlow: [],
  };
}

function getEmptyReceivables(): ReceivablesData {
  return {
    totalAmount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    byAge: [],
    topDebtors: [],
  };
}

function getEmptyPayables(): PayablesData {
  return {
    totalAmount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    byAge: [],
    topCreditors: [],
  };
}

function getEmptyTenderProfitability(): TenderProfitabilityData {
  return {
    activeTendersCount: 0,
    totalContractValue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    averageMargin: 0,
    tenders: [],
  };
}

function getEmptyTaxCalendar(): TaxCalendarData {
  return {
    upcomingPayments: [],
    overduePayments: [],
    totalUpcoming: 0,
    totalOverdue: 0,
    nextPaymentDate: null,
  };
}

function getEmptyUnpaidInvoices(): UnpaidInvoicesData {
  return {
    totalCount: 0,
    totalAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    byStatus: [],
    invoices: [],
  };
}
