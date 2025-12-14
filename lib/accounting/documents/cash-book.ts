"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { getAccountingSettings } from "../service";

// ============================================
// Типы для кассовой книги
// ============================================

export interface CashBookEntry {
  id: string;
  order_type: "pko" | "rko";
  order_number: string;
  counterparty_name: string;
  basis: string;
  amount: number;
  balance_after: number;
}

export interface CashBookPage {
  date: string;
  page_number: number;
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expense: number;
  entries: CashBookEntry[];
}

export interface CashBook {
  year: number;
  month: number;
  organization_name: string;
  okpo?: string;
  pages: CashBookPage[];
  total_pages: number;
}

// ============================================
// Генерация кассовой книги
// ============================================

export async function generateCashBook(
  year: number,
  month: number
): Promise<CashBook | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const settings = await getAccountingSettings();
  if (!settings) return null;
  
  // Даты периода
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Получаем все подписанные ордера за период
  const { data: orders } = await supabase
    .from("cash_orders")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .gte("order_date", startDate.toISOString().split("T")[0])
    .lte("order_date", endDate.toISOString().split("T")[0])
    .order("order_date")
    .order("created_at");
  
  // Получаем входящий остаток (сумма всех ордеров до начала периода)
  const { data: prevOrders } = await supabase
    .from("cash_orders")
    .select("order_type, amount")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .lt("order_date", startDate.toISOString().split("T")[0]);
  
  let openingBalance = 0;
  prevOrders?.forEach(o => {
    if (o.order_type === "pko") {
      openingBalance += o.amount;
    } else {
      openingBalance -= o.amount;
    }
  });
  
  // Группируем ордера по дням
  const ordersByDate = new Map<string, typeof orders>();
  orders?.forEach(order => {
    const date = order.order_date;
    const list = ordersByDate.get(date) || [];
    list.push(order);
    ordersByDate.set(date, list);
  });
  
  // Формируем страницы
  const pages: CashBookPage[] = [];
  let pageNumber = 1;
  let runningBalance = openingBalance;
  
  const sortedDates = Array.from(ordersByDate.keys()).sort();
  
  for (const date of sortedDates) {
    const dayOrders = ordersByDate.get(date) || [];
    const dayOpeningBalance = runningBalance;
    
    let totalIncome = 0;
    let totalExpense = 0;
    const entries: CashBookEntry[] = [];
    
    for (const order of dayOrders) {
      if (order.order_type === "pko") {
        runningBalance += order.amount;
        totalIncome += order.amount;
      } else {
        runningBalance -= order.amount;
        totalExpense += order.amount;
      }
      
      entries.push({
        id: order.id,
        order_type: order.order_type,
        order_number: order.number,
        counterparty_name: order.counterparty_name,
        basis: order.basis,
        amount: order.amount,
        balance_after: runningBalance,
      });
    }
    
    pages.push({
      date,
      page_number: pageNumber++,
      opening_balance: dayOpeningBalance,
      closing_balance: runningBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      entries,
    });
  }
  
  return {
    year,
    month,
    organization_name: settings.full_name,
    okpo: settings.okpo || undefined,
    pages,
    total_pages: pages.length,
  };
}

// ============================================
// Итоги за период
// ============================================

export interface CashBookSummary {
  year: number;
  month: number;
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expense: number;
  days_with_operations: number;
  pko_count: number;
  rko_count: number;
}

export async function getCashBookSummary(
  year: number,
  month: number
): Promise<CashBookSummary | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Входящий остаток
  const { data: prevOrders } = await supabase
    .from("cash_orders")
    .select("order_type, amount")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .lt("order_date", startDate.toISOString().split("T")[0]);
  
  let openingBalance = 0;
  prevOrders?.forEach(o => {
    if (o.order_type === "pko") openingBalance += o.amount;
    else openingBalance -= o.amount;
  });
  
  // Ордера за период
  const { data: orders } = await supabase
    .from("cash_orders")
    .select("order_type, amount, order_date")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .gte("order_date", startDate.toISOString().split("T")[0])
    .lte("order_date", endDate.toISOString().split("T")[0]);
  
  let totalIncome = 0;
  let totalExpense = 0;
  let pkoCount = 0;
  let rkoCount = 0;
  const uniqueDates = new Set<string>();
  
  orders?.forEach(o => {
    uniqueDates.add(o.order_date);
    if (o.order_type === "pko") {
      totalIncome += o.amount;
      pkoCount++;
    } else {
      totalExpense += o.amount;
      rkoCount++;
    }
  });
  
  return {
    year,
    month,
    opening_balance: openingBalance,
    closing_balance: openingBalance + totalIncome - totalExpense,
    total_income: totalIncome,
    total_expense: totalExpense,
    days_with_operations: uniqueDates.size,
    pko_count: pkoCount,
    rko_count: rkoCount,
  };
}

// ============================================
// Список доступных месяцев
// ============================================

export async function getAvailableCashBookMonths(): Promise<{ year: number; month: number }[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data } = await supabase
    .from("cash_orders")
    .select("order_date")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .order("order_date", { ascending: false });
  
  const months = new Set<string>();
  data?.forEach(o => {
    const d = new Date(o.order_date);
    months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });
  
  return Array.from(months).map(m => {
    const [year, month] = m.split("-").map(Number);
    return { year, month };
  });
}
