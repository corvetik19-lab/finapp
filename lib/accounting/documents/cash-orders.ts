"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { getAccountingSettings } from "../service";

// ============================================
// Типы для кассовых ордеров
// ============================================

export type CashOrderType = "pko" | "rko"; // ПКО - приходный, РКО - расходный

export interface CashOrder {
  id?: string;
  company_id: string;
  
  order_type: CashOrderType;
  number: string;
  order_date: string;
  
  // Сумма
  amount: number;
  amount_words?: string;
  
  // Контрагент / получатель / плательщик
  counterparty_name: string;
  counterparty_inn?: string;
  
  // Основание и приложение
  basis: string;
  attachment?: string;
  
  // Корреспондирующий счёт
  debit_account?: string;  // Для ПКО
  credit_account?: string; // Для РКО
  
  // Подписанты
  director_name?: string;
  accountant_name?: string;
  cashier_name?: string;
  
  // Паспортные данные (для РКО)
  passport_data?: string;
  
  // Связи
  counterparty_id?: string;
  transaction_id?: string;
  
  status: "draft" | "signed" | "cancelled";
  created_at: string;
}

// ============================================
// CRUD операции
// ============================================

export async function getCashOrders(type?: CashOrderType): Promise<CashOrder[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("cash_orders")
    .select("*")
    .eq("company_id", companyId)
    .order("order_date", { ascending: false });
  
  if (type) {
    query = query.eq("order_type", type);
  }
  
  const { data } = await query;
  
  return data || [];
}

export async function getCashOrder(id: string): Promise<CashOrder | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data } = await supabase
    .from("cash_orders")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  return data;
}

export async function getNextCashOrderNumber(type: CashOrderType): Promise<string> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return "1";
  
  const { data } = await supabase
    .from("cash_orders")
    .select("number")
    .eq("company_id", companyId)
    .eq("order_type", type)
    .order("created_at", { ascending: false })
    .limit(1);
  
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].number) || 0;
    return String(lastNum + 1);
  }
  
  return "1";
}

export async function createCashOrder(
  order: Omit<CashOrder, "id" | "company_id" | "created_at">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Конвертируем сумму в слова
  const amountWords = order.amount_words || amountToWords(order.amount);
  
  const { data, error } = await supabase
    .from("cash_orders")
    .insert({
      ...order,
      amount_words: amountWords,
      company_id: companyId,
    })
    .select("id")
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, id: data?.id };
}

export async function updateCashOrder(
  id: string,
  updates: Partial<CashOrder>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("cash_orders")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deleteCashOrder(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("cash_orders")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Подготовка данных для нового ордера
// ============================================

export async function prepareCashOrder(type: CashOrderType): Promise<Partial<CashOrder> | null> {
  const settings = await getAccountingSettings();
  if (!settings) return null;
  
  const nextNumber = await getNextCashOrderNumber(type);
  const today = new Date().toISOString().split("T")[0];
  
  return {
    order_type: type,
    number: nextNumber,
    order_date: today,
    amount: 0,
    counterparty_name: "",
    basis: "",
    director_name: settings.director_name || undefined,
    accountant_name: settings.accountant_name || undefined,
    status: "draft",
  };
}

// ============================================
// Касса (остаток)
// ============================================

export async function getCashBalance(): Promise<{ balance: number; lastDate?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return { balance: 0 };
  
  // Получаем все подписанные ордера
  const { data } = await supabase
    .from("cash_orders")
    .select("order_type, amount, order_date")
    .eq("company_id", companyId)
    .eq("status", "signed")
    .order("order_date", { ascending: false });
  
  if (!data || data.length === 0) {
    return { balance: 0 };
  }
  
  let balance = 0;
  data.forEach(order => {
    if (order.order_type === "pko") {
      balance += order.amount;
    } else {
      balance -= order.amount;
    }
  });
  
  return {
    balance,
    lastDate: data[0]?.order_date,
  };
}

// ============================================
// Сумма прописью
// ============================================

export function amountToWords(kopeks: number): string {
  const rubles = Math.floor(kopeks / 100);
  const kop = kopeks % 100;
  
  const rublesWord = numberToWordsRu(rubles);
  const rublesEnding = getRublesEnding(rubles);
  const kopEnding = getKopeeksEnding(kop);
  
  return `${rublesWord} ${rublesEnding} ${kop.toString().padStart(2, "0")} ${kopEnding}`;
}

function numberToWordsRu(num: number): string {
  if (num === 0) return "ноль";
  
  const ones = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", 
                 "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", 
                "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот",
                    "шестьсот", "семьсот", "восемьсот", "девятьсот"];
  
  let result = "";
  
  // Тысячи
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands >= 100) {
      result += hundreds[Math.floor(thousands / 100)] + " ";
      const t = thousands % 100;
      if (t >= 10 && t < 20) {
        result += teens[t - 10] + " тысяч ";
      } else {
        if (t >= 20) result += tens[Math.floor(t / 10)] + " ";
        const t1 = t % 10;
        if (t1 === 1) result += "одна тысяча ";
        else if (t1 === 2) result += "две тысячи ";
        else if (t1 >= 3 && t1 <= 4) result += ones[t1] + " тысячи ";
        else if (t1 >= 5) result += ones[t1] + " тысяч ";
        else result += "тысяч ";
      }
    } else if (thousands >= 10 && thousands < 20) {
      result += teens[thousands - 10] + " тысяч ";
    } else {
      if (thousands >= 20) result += tens[Math.floor(thousands / 10)] + " ";
      const t1 = thousands % 10;
      if (t1 === 1) result += "одна тысяча ";
      else if (t1 === 2) result += "две тысячи ";
      else if (t1 >= 3 && t1 <= 4) result += ones[t1] + " тысячи ";
      else if (t1 >= 5) result += ones[t1] + " тысяч ";
      else if (thousands > 0) result += "тысяч ";
    }
    num %= 1000;
  }
  
  // Сотни
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)] + " ";
    num %= 100;
  }
  
  // Десятки и единицы
  if (num >= 10 && num < 20) {
    result += teens[num - 10] + " ";
  } else {
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + " ";
    }
    if (num % 10 > 0) {
      result += ones[num % 10] + " ";
    }
  }
  
  return result.trim();
}

function getRublesEnding(num: number): string {
  const n = num % 100;
  if (n >= 11 && n <= 19) return "рублей";
  const last = num % 10;
  if (last === 1) return "рубль";
  if (last >= 2 && last <= 4) return "рубля";
  return "рублей";
}

function getKopeeksEnding(num: number): string {
  const n = num % 100;
  if (n >= 11 && n <= 19) return "копеек";
  const last = num % 10;
  if (last === 1) return "копейка";
  if (last >= 2 && last <= 4) return "копейки";
  return "копеек";
}
