"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// Типы отчётов
export type ReportPeriod = "month" | "quarter" | "year" | "custom";

export interface ReportFilters {
  period: ReportPeriod;
  dateFrom: string;
  dateTo: string;
  counterpartyId?: string;
  categoryId?: string;
}

// Отчёт Доходы/Расходы
export interface IncomeExpenseReport {
  period: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  byMonth: {
    month: string;
    income: number;
    expense: number;
    balance: number;
  }[];
  byCategory: {
    categoryName: string;
    categoryType: "income" | "expense";
    amount: number;
    percentage: number;
  }[];
  topIncomeSources: {
    counterpartyName: string;
    amount: number;
  }[];
  topExpenseCategories: {
    categoryName: string;
    amount: number;
  }[];
}

export async function getIncomeExpenseReport(
  filters: ReportFilters
): Promise<IncomeExpenseReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
      byMonth: [],
      byCategory: [],
      topIncomeSources: [],
      topExpenseCategories: [],
    };
  }

  // Получаем записи КУДиР за период
  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("entry_date, entry_type, amount, counterparty_name, description")
    .eq("company_id", companyId)
    .gte("entry_date", filters.dateFrom)
    .lte("entry_date", filters.dateTo);

  if (!entries || entries.length === 0) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
      byMonth: [],
      byCategory: [],
      topIncomeSources: [],
      topExpenseCategories: [],
    };
  }

  // Подсчёт итогов
  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyData: Record<string, { income: number; expense: number }> = {};
  const incomeByCounterparty: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};

  for (const entry of entries) {
    const month = entry.entry_date.substring(0, 7); // YYYY-MM

    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0 };
    }

    if (entry.entry_type === "income") {
      totalIncome += entry.amount;
      monthlyData[month].income += entry.amount;

      const counterparty = entry.counterparty_name || "Прочие";
      incomeByCounterparty[counterparty] = (incomeByCounterparty[counterparty] || 0) + entry.amount;
    } else {
      totalExpense += entry.amount;
      monthlyData[month].expense += entry.amount;

      // Категоризация по ключевым словам в описании
      const category = categorizeExpense(entry.description || "");
      expenseByCategory[category] = (expenseByCategory[category] || 0) + entry.amount;
    }
  }

  // Формируем данные по месяцам
  const byMonth = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));

  // Формируем данные по категориям
  const byCategory: IncomeExpenseReport["byCategory"] = [];
  
  for (const [name, amount] of Object.entries(incomeByCounterparty)) {
    byCategory.push({
      categoryName: name,
      categoryType: "income",
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    });
  }

  for (const [name, amount] of Object.entries(expenseByCategory)) {
    byCategory.push({
      categoryName: name,
      categoryType: "expense",
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    });
  }

  // Топ источников дохода
  const topIncomeSources = Object.entries(incomeByCounterparty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([counterpartyName, amount]) => ({ counterpartyName, amount }));

  // Топ категорий расходов
  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryName, amount]) => ({ categoryName, amount }));

  return {
    period: { from: filters.dateFrom, to: filters.dateTo },
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    },
    byMonth,
    byCategory,
    topIncomeSources,
    topExpenseCategories,
  };
}

// Вспомогательная функция категоризации расходов
function categorizeExpense(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes("зарплат") || desc.includes("оплата труда")) return "Зарплата";
  if (desc.includes("налог") || desc.includes("ндфл") || desc.includes("усн")) return "Налоги";
  if (desc.includes("аренд")) return "Аренда";
  if (desc.includes("комиссия") || desc.includes("банк")) return "Банковские услуги";
  if (desc.includes("закупк") || desc.includes("товар") || desc.includes("материал")) return "Закупки";
  if (desc.includes("реклам") || desc.includes("маркетинг")) return "Маркетинг";
  if (desc.includes("связь") || desc.includes("интернет") || desc.includes("телефон")) return "Связь";
  if (desc.includes("транспорт") || desc.includes("доставк")) return "Транспорт";
  
  return "Прочие расходы";
}

// Отчёт по НДС
export interface VatReport {
  period: { from: string; to: string };
  summary: {
    vatReceived: number;  // НДС к начислению (исходящий)
    vatPaid: number;      // НДС к вычету (входящий)
    vatToPay: number;     // НДС к уплате
  };
  outputVat: {
    documentNumber: string;
    documentDate: string;
    counterpartyName: string;
    totalAmount: number;
    vatAmount: number;
  }[];
  inputVat: {
    documentNumber: string;
    documentDate: string;
    counterpartyName: string;
    totalAmount: number;
    vatAmount: number;
  }[];
}

export async function getVatReport(filters: ReportFilters): Promise<VatReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: { vatReceived: 0, vatPaid: 0, vatToPay: 0 },
      outputVat: [],
      inputVat: [],
    };
  }

  // Документы за период
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select(`
      document_number,
      document_date,
      document_type,
      total_amount,
      vat_amount,
      accounting_counterparties(name)
    `)
    .eq("company_id", companyId)
    .gte("document_date", filters.dateFrom)
    .lte("document_date", filters.dateTo)
    .not("vat_amount", "is", null);

  if (!documents) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: { vatReceived: 0, vatPaid: 0, vatToPay: 0 },
      outputVat: [],
      inputVat: [],
    };
  }

  const outputVat: VatReport["outputVat"] = [];
  const inputVat: VatReport["inputVat"] = [];
  let vatReceived = 0;
  let vatPaid = 0;

  for (const doc of documents) {
    const counterpartyData = doc.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
    const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
    const entry = {
      documentNumber: doc.document_number,
      documentDate: doc.document_date,
      counterpartyName: counterparty?.name || "—",
      totalAmount: doc.total_amount,
      vatAmount: doc.vat_amount || 0,
    };

    // Исходящие документы (счета, акты) - НДС к начислению
    if (["invoice", "act", "invoice_upd"].includes(doc.document_type)) {
      outputVat.push(entry);
      vatReceived += entry.vatAmount;
    }
    // Входящие документы - НДС к вычету
    else if (["purchase_invoice", "expense"].includes(doc.document_type)) {
      inputVat.push(entry);
      vatPaid += entry.vatAmount;
    }
  }

  return {
    period: { from: filters.dateFrom, to: filters.dateTo },
    summary: {
      vatReceived,
      vatPaid,
      vatToPay: vatReceived - vatPaid,
    },
    outputVat,
    inputVat,
  };
}

// Отчёт Прибыли и Убытки (P&L)
export interface ProfitLossReport {
  period: { from: string; to: string };
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: {
    category: string;
    amount: number;
  }[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  taxes: number;
  netProfit: number;
  profitMargin: number;
}

export async function getProfitLossReport(filters: ReportFilters): Promise<ProfitLossReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptyReport: ProfitLossReport = {
    period: { from: filters.dateFrom, to: filters.dateTo },
    revenue: 0,
    costOfSales: 0,
    grossProfit: 0,
    operatingExpenses: [],
    totalOperatingExpenses: 0,
    operatingProfit: 0,
    taxes: 0,
    netProfit: 0,
    profitMargin: 0,
  };

  if (!companyId) return emptyReport;

  // Записи КУДиР
  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("entry_type, amount, description")
    .eq("company_id", companyId)
    .gte("entry_date", filters.dateFrom)
    .lte("entry_date", filters.dateTo);

  if (!entries) return emptyReport;

  let revenue = 0;
  let costOfSales = 0;
  let taxes = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.entry_type === "income") {
      revenue += entry.amount;
    } else {
      const category = categorizeExpense(entry.description || "");
      
      // Себестоимость (закупки)
      if (category === "Закупки") {
        costOfSales += entry.amount;
      }
      // Налоги
      else if (category === "Налоги") {
        taxes += entry.amount;
      }
      // Операционные расходы
      else {
        expensesByCategory[category] = (expensesByCategory[category] || 0) + entry.amount;
      }
    }
  }

  const operatingExpenses = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalOperatingExpenses = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = revenue - costOfSales;
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const netProfit = operatingProfit - taxes;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    period: { from: filters.dateFrom, to: filters.dateTo },
    revenue,
    costOfSales,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    operatingProfit,
    taxes,
    netProfit,
    profitMargin,
  };
}

// Отчёт по контрагентам
export interface CounterpartyReport {
  period: { from: string; to: string };
  counterparties: {
    id: string;
    name: string;
    inn: string | null;
    documentsCount: number;
    totalInvoiced: number;
    totalPaid: number;
    debt: number;
  }[];
  totalInvoiced: number;
  totalPaid: number;
  totalDebt: number;
}

export async function getCounterpartyReport(filters: ReportFilters): Promise<CounterpartyReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      counterparties: [],
      totalInvoiced: 0,
      totalPaid: 0,
      totalDebt: 0,
    };
  }

  // Контрагенты с документами
  const { data: counterparties } = await supabase
    .from("accounting_counterparties")
    .select("id, name, inn")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!counterparties) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      counterparties: [],
      totalInvoiced: 0,
      totalPaid: 0,
      totalDebt: 0,
    };
  }

  // Документы за период
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("counterparty_id, total_amount, payment_status")
    .eq("company_id", companyId)
    .gte("document_date", filters.dateFrom)
    .lte("document_date", filters.dateTo)
    .in("document_type", ["invoice", "act", "invoice_upd"]);

  // Группируем по контрагентам
  const stats: Record<string, { count: number; invoiced: number; paid: number }> = {};

  for (const doc of documents || []) {
    if (!doc.counterparty_id) continue;

    if (!stats[doc.counterparty_id]) {
      stats[doc.counterparty_id] = { count: 0, invoiced: 0, paid: 0 };
    }

    stats[doc.counterparty_id].count++;
    stats[doc.counterparty_id].invoiced += doc.total_amount || 0;

    if (doc.payment_status === "paid") {
      stats[doc.counterparty_id].paid += doc.total_amount || 0;
    }
  }

  const result = counterparties
    .filter(c => stats[c.id])
    .map(c => ({
      id: c.id,
      name: c.name,
      inn: c.inn,
      documentsCount: stats[c.id]?.count || 0,
      totalInvoiced: stats[c.id]?.invoiced || 0,
      totalPaid: stats[c.id]?.paid || 0,
      debt: (stats[c.id]?.invoiced || 0) - (stats[c.id]?.paid || 0),
    }))
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  const totalInvoiced = result.reduce((sum, c) => sum + c.totalInvoiced, 0);
  const totalPaid = result.reduce((sum, c) => sum + c.totalPaid, 0);

  return {
    period: { from: filters.dateFrom, to: filters.dateTo },
    counterparties: result,
    totalInvoiced,
    totalPaid,
    totalDebt: totalInvoiced - totalPaid,
  };
}

// Отчёт по тендерам
export interface TenderReport {
  period: { from: string; to: string };
  summary: {
    totalTenders: number;
    wonTenders: number;
    totalContractValue: number;
    totalPaid: number;
    totalExpenses: number;
    profit: number;
    winRate: number;
  };
  tenders: {
    id: string;
    purchaseNumber: string;
    customer: string;
    contractPrice: number | null;
    status: string;
    documentsCount: number;
    paid: number;
    expenses: number;
    profit: number;
  }[];
}

export async function getTenderReport(filters: ReportFilters): Promise<TenderReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalTenders: 0,
        wonTenders: 0,
        totalContractValue: 0,
        totalPaid: 0,
        totalExpenses: 0,
        profit: 0,
        winRate: 0,
      },
      tenders: [],
    };
  }

  // Тендеры за период
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, purchase_number, customer, contract_price, status")
    .eq("company_id", companyId)
    .gte("created_at", filters.dateFrom)
    .lte("created_at", filters.dateTo)
    .is("deleted_at", null);

  if (!tenders || tenders.length === 0) {
    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalTenders: 0,
        wonTenders: 0,
        totalContractValue: 0,
        totalPaid: 0,
        totalExpenses: 0,
        profit: 0,
        winRate: 0,
      },
      tenders: [],
    };
  }

  const tenderIds = tenders.map(t => t.id);

  // Документы по тендерам
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("tender_id, total_amount, payment_status")
    .eq("company_id", companyId)
    .in("tender_id", tenderIds);

  // Записи КУДиР по тендерам
  const { data: kudirEntries } = await supabase
    .from("kudir_entries")
    .select("tender_id, entry_type, amount")
    .eq("company_id", companyId)
    .in("tender_id", tenderIds);

  // Группируем данные
  const docsByTender: Record<string, { count: number; paid: number }> = {};
  const kudirByTender: Record<string, { income: number; expense: number }> = {};

  for (const doc of documents || []) {
    if (!doc.tender_id) continue;
    if (!docsByTender[doc.tender_id]) {
      docsByTender[doc.tender_id] = { count: 0, paid: 0 };
    }
    docsByTender[doc.tender_id].count++;
    if (doc.payment_status === "paid") {
      docsByTender[doc.tender_id].paid += doc.total_amount || 0;
    }
  }

  for (const entry of kudirEntries || []) {
    if (!entry.tender_id) continue;
    if (!kudirByTender[entry.tender_id]) {
      kudirByTender[entry.tender_id] = { income: 0, expense: 0 };
    }
    if (entry.entry_type === "income") {
      kudirByTender[entry.tender_id].income += entry.amount;
    } else {
      kudirByTender[entry.tender_id].expense += entry.amount;
    }
  }

  const tendersResult = tenders.map(t => {
    const docs = docsByTender[t.id] || { count: 0, paid: 0 };
    const kudir = kudirByTender[t.id] || { income: 0, expense: 0 };

    return {
      id: t.id,
      purchaseNumber: t.purchase_number,
      customer: t.customer,
      contractPrice: t.contract_price,
      status: t.status,
      documentsCount: docs.count,
      paid: docs.paid,
      expenses: kudir.expense,
      profit: kudir.income - kudir.expense,
    };
  });

  const wonTenders = tenders.filter(t => t.status === "won").length;
  const totalContractValue = tenders
    .filter(t => t.status === "won")
    .reduce((sum, t) => sum + (t.contract_price || 0), 0);
  const totalPaid = tendersResult.reduce((sum, t) => sum + t.paid, 0);
  const totalExpenses = tendersResult.reduce((sum, t) => sum + t.expenses, 0);
  const profit = tendersResult.reduce((sum, t) => sum + t.profit, 0);

  return {
    period: { from: filters.dateFrom, to: filters.dateTo },
    summary: {
      totalTenders: tenders.length,
      wonTenders,
      totalContractValue,
      totalPaid,
      totalExpenses,
      profit,
      winRate: tenders.length > 0 ? (wonTenders / tenders.length) * 100 : 0,
    },
    tenders: tendersResult,
  };
}

// Вспомогательные функции для периодов
export async function getDateRangeForPeriod(
  period: ReportPeriod,
  customFrom?: string,
  customTo?: string
): Promise<{ dateFrom: string; dateTo: string }> {
  const now = new Date();

  switch (period) {
    case "month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        dateFrom: firstDay.toISOString().split("T")[0],
        dateTo: lastDay.toISOString().split("T")[0],
      };
    }
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return {
        dateFrom: firstDay.toISOString().split("T")[0],
        dateTo: lastDay.toISOString().split("T")[0],
      };
    }
    case "year": {
      return {
        dateFrom: `${now.getFullYear()}-01-01`,
        dateTo: `${now.getFullYear()}-12-31`,
      };
    }
    case "custom":
    default:
      return {
        dateFrom: customFrom || `${now.getFullYear()}-01-01`,
        dateTo: customTo || now.toISOString().split("T")[0],
      };
  }
}
