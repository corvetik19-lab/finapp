"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// ============================================
// Типы для отчётов
// ============================================

export interface CashFlowItem {
  category: string;
  description: string;
  amount: number;
}

export interface CashFlowSection {
  name: string;
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowReport {
  period: string;
  openingBalance: number;
  closingBalance: number;
  
  // Операционная деятельность
  operating: CashFlowSection;
  
  // Инвестиционная деятельность
  investing: CashFlowSection;
  
  // Финансовая деятельность
  financing: CashFlowSection;
  
  // Итоги
  netCashFlow: number;
  
  // Помесячная разбивка
  monthlyData: {
    month: number;
    income: number;
    expense: number;
    netFlow: number;
  }[];
}

// ============================================
// Отчёт ДДС (Движение денежных средств)
// ============================================

export async function getCashFlowReport(
  year: number,
  month?: number
): Promise<CashFlowReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  const startDate = month 
    ? `${year}-${String(month).padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month
    ? new Date(year, month, 0).toISOString().split('T')[0]
    : `${year}-12-31`;
  
  const periodLabel = month 
    ? `${new Date(year, month - 1).toLocaleString('ru', { month: 'long' })} ${year}`
    : `${year} год`;
  
  if (!companyId) {
    return getEmptyReport(periodLabel);
  }
  
  // Получаем записи КУДиР за период
  const { data: kudirData } = await supabase
    .from("kudir_entries")
    .select("*")
    .eq("company_id", companyId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date");
  
  // Получаем документы за период для классификации
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("*, counterparty:accounting_counterparties(short_name)")
    .eq("company_id", companyId)
    .gte("document_date", startDate)
    .lte("document_date", endDate)
    .is("deleted_at", null);
  
  // Классифицируем по типам деятельности
  const operatingIncome: CashFlowItem[] = [];
  const operatingExpense: CashFlowItem[] = [];
  const investingItems: CashFlowItem[] = [];
  const financingItems: CashFlowItem[] = [];
  
  // Группируем доходы по контрагентам
  const incomeByCounterparty = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();
  
  documents?.forEach(doc => {
    const cpData = doc.counterparty as unknown;
    const cp = Array.isArray(cpData) ? cpData[0] : cpData;
    const cpName = (cp as { short_name?: string })?.short_name || 'Прочие';
    
    if (doc.direction === 'outgoing' && doc.status === 'paid') {
      // Доходы
      incomeByCounterparty.set(
        cpName, 
        (incomeByCounterparty.get(cpName) || 0) + (doc.total || 0)
      );
    } else if (doc.direction === 'incoming' && doc.status === 'paid') {
      // Расходы - классифицируем по типу документа
      const category = getExpenseCategory(doc.document_type);
      expenseByCategory.set(
        category,
        (expenseByCategory.get(category) || 0) + (doc.total || 0)
      );
    }
  });
  
  // Формируем операционные доходы
  incomeByCounterparty.forEach((amount, name) => {
    operatingIncome.push({
      category: "Поступления от покупателей",
      description: name,
      amount: amount,
    });
  });
  
  // Формируем операционные расходы
  expenseByCategory.forEach((amount, category) => {
    operatingExpense.push({
      category: "Платежи поставщикам",
      description: category,
      amount: -amount,
    });
  });
  
  // Считаем итоги из КУДиР
  const totalIncome = kudirData?.reduce((sum, e) => sum + (e.income || 0), 0) || 0;
  const totalExpense = kudirData?.reduce((sum, e) => sum + (e.expense || 0), 0) || 0;
  
  // Если нет детализации - добавляем общие суммы
  if (operatingIncome.length === 0 && totalIncome > 0) {
    operatingIncome.push({
      category: "Поступления от покупателей",
      description: "Выручка от реализации",
      amount: totalIncome,
    });
  }
  
  if (operatingExpense.length === 0 && totalExpense > 0) {
    operatingExpense.push({
      category: "Платежи поставщикам",
      description: "Расходы на закупки",
      amount: -totalExpense,
    });
  }
  
  const operatingTotal = 
    operatingIncome.reduce((s, i) => s + i.amount, 0) +
    operatingExpense.reduce((s, i) => s + i.amount, 0);
  
  const investingTotal = investingItems.reduce((s, i) => s + i.amount, 0);
  const financingTotal = financingItems.reduce((s, i) => s + i.amount, 0);
  
  // Помесячная разбивка
  const monthlyMap = new Map<number, { income: number; expense: number }>();
  for (let i = 1; i <= 12; i++) {
    monthlyMap.set(i, { income: 0, expense: 0 });
  }
  
  kudirData?.forEach(entry => {
    const m = new Date(entry.entry_date).getMonth() + 1;
    const current = monthlyMap.get(m)!;
    current.income += entry.income || 0;
    current.expense += entry.expense || 0;
  });
  
  const monthlyData = Array.from(monthlyMap.entries()).map(([m, data]) => ({
    month: m,
    income: data.income,
    expense: data.expense,
    netFlow: data.income - data.expense,
  }));
  
  return {
    period: periodLabel,
    openingBalance: 0, // TODO: получить из предыдущего периода
    closingBalance: operatingTotal + investingTotal + financingTotal,
    
    operating: {
      name: "Операционная деятельность",
      items: [...operatingIncome, ...operatingExpense],
      total: operatingTotal,
    },
    
    investing: {
      name: "Инвестиционная деятельность",
      items: investingItems,
      total: investingTotal,
    },
    
    financing: {
      name: "Финансовая деятельность",
      items: financingItems,
      total: financingTotal,
    },
    
    netCashFlow: operatingTotal + investingTotal + financingTotal,
    monthlyData,
  };
}

function getExpenseCategory(docType: string): string {
  const categories: Record<string, string> = {
    invoice: "Оплата счетов",
    act: "Оплата услуг",
    waybill: "Закупка товаров",
    upd: "Закупка товаров/услуг",
  };
  return categories[docType] || "Прочие расходы";
}

function getEmptyReport(period: string): CashFlowReport {
  return {
    period,
    openingBalance: 0,
    closingBalance: 0,
    operating: { name: "Операционная деятельность", items: [], total: 0 },
    investing: { name: "Инвестиционная деятельность", items: [], total: 0 },
    financing: { name: "Финансовая деятельность", items: [], total: 0 },
    netCashFlow: 0,
    monthlyData: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      netFlow: 0,
    })),
  };
}

// ============================================
// P&L по тендерам (маржинальность)
// ============================================

export interface TenderPnL {
  tenderId: string;
  purchaseNumber: string;
  subject: string;
  revenue: number;
  directCosts: number;
  indirectCosts: number;
  grossProfit: number;
  margin: number;
  status: string;
}

export async function getTendersPnL(year?: number): Promise<TenderPnL[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const currentYear = year || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  
  // Получаем тендеры с документами
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, purchase_number, subject, status, contract_price")
    .eq("company_id", companyId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  
  if (!tenders) return [];
  
  // Получаем документы связанные с тендерами
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("tender_id, direction, total, status")
    .eq("company_id", companyId)
    .in("tender_id", tenders.map(t => t.id))
    .eq("status", "paid");
  
  const result: TenderPnL[] = [];
  
  for (const tender of tenders) {
    const tenderDocs = documents?.filter(d => d.tender_id === tender.id) || [];
    
    const revenue = tenderDocs
      .filter(d => d.direction === "outgoing")
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const directCosts = tenderDocs
      .filter(d => d.direction === "incoming")
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const indirectCosts = 0; // TODO: распределение косвенных расходов
    
    const grossProfit = revenue - directCosts - indirectCosts;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    
    result.push({
      tenderId: tender.id,
      purchaseNumber: tender.purchase_number,
      subject: tender.subject,
      revenue,
      directCosts,
      indirectCosts,
      grossProfit,
      margin,
      status: tender.status,
    });
  }
  
  return result.sort((a, b) => b.revenue - a.revenue);
}

// ============================================
// Платёжный календарь
// ============================================

export interface PaymentCalendarItem {
  id: string;
  date: string;
  type: "income" | "expense" | "tax";
  description: string;
  counterparty?: string;
  amount: number;
  status: "planned" | "overdue" | "paid";
  documentId?: string;
}

export interface PaymentCalendarReport {
  items: PaymentCalendarItem[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashGapWarning: boolean;
  cashGapDate?: string;
}

export async function getPaymentCalendar(
  startDate: string,
  endDate: string
): Promise<PaymentCalendarReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return {
      items: [],
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      cashGapWarning: false,
    };
  }
  
  const items: PaymentCalendarItem[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Получаем неоплаченные документы
  const { data: unpaidDocs } = await supabase
    .from("accounting_documents")
    .select("*, counterparty:accounting_counterparties(short_name)")
    .eq("company_id", companyId)
    .eq("status", "issued")
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .is("deleted_at", null);
  
  unpaidDocs?.forEach(doc => {
    const cpData = doc.counterparty as unknown;
    const cp = Array.isArray(cpData) ? cpData[0] : cpData;
    const cpName = (cp as { short_name?: string })?.short_name;
    
    const isOverdue = doc.due_date && doc.due_date < today;
    
    items.push({
      id: doc.id,
      date: doc.due_date || doc.document_date,
      type: doc.direction === "outgoing" ? "income" : "expense",
      description: `${doc.document_type.toUpperCase()} №${doc.document_number}`,
      counterparty: cpName,
      amount: doc.total,
      status: isOverdue ? "overdue" : "planned",
      documentId: doc.id,
    });
  });
  
  // Получаем предстоящие налоги
  const { data: taxes } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId)
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .neq("status", "paid");
  
  taxes?.forEach(tax => {
    const remaining = (tax.calculated_amount || 0) - (tax.paid_amount || 0);
    if (remaining > 0) {
      const isOverdue = tax.due_date < today;
      
      items.push({
        id: tax.id,
        date: tax.due_date,
        type: "tax",
        description: tax.tax_name,
        amount: remaining,
        status: isOverdue ? "overdue" : "planned",
      });
    }
  });
  
  // Сортируем по дате
  items.sort((a, b) => a.date.localeCompare(b.date));
  
  // Считаем итоги
  const totalIncome = items
    .filter(i => i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);
  
  const totalExpense = items
    .filter(i => i.type !== "income")
    .reduce((sum, i) => sum + i.amount, 0);
  
  // Проверяем кассовый разрыв
  let runningBalance = 0; // TODO: текущий остаток на счетах
  let cashGapWarning = false;
  let cashGapDate: string | undefined;
  
  for (const item of items) {
    if (item.type === "income") {
      runningBalance += item.amount;
    } else {
      runningBalance -= item.amount;
    }
    
    if (runningBalance < 0 && !cashGapWarning) {
      cashGapWarning = true;
      cashGapDate = item.date;
    }
  }
  
  return {
    items,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    cashGapWarning,
    cashGapDate,
  };
}
