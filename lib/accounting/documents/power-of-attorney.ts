"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { getAccountingSettings } from "../service";

// ============================================
// Типы для доверенности М-2
// ============================================

export interface PowerOfAttorneyItem {
  name: string;
  unit: string;
  quantity: number;
}

export interface PowerOfAttorney {
  id?: string;
  company_id: string;
  
  // Номер и даты
  number: string;
  issue_date: string;
  valid_until: string;
  
  // Организация
  organization_name: string;
  organization_inn?: string;
  organization_kpp?: string;
  organization_address?: string;
  organization_okpo?: string;
  
  // Банковские реквизиты
  bank_name?: string;
  bank_account?: string;
  
  // Доверенное лицо
  employee_name: string;
  employee_position?: string;
  employee_passport_series?: string;
  employee_passport_number?: string;
  employee_passport_issued_by?: string;
  employee_passport_issued_date?: string;
  
  // Поставщик
  supplier_name: string;
  supplier_inn?: string;
  
  // Документ-основание
  basis_document?: string;
  basis_document_number?: string;
  basis_document_date?: string;
  
  // ТМЦ
  items: PowerOfAttorneyItem[];
  
  // Подписанты
  director_name?: string;
  director_position?: string;
  accountant_name?: string;
  
  status: "draft" | "issued" | "used" | "cancelled";
  created_at: string;
}

// ============================================
// CRUD операции
// ============================================

export async function getPowerOfAttorneys(): Promise<PowerOfAttorney[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data } = await supabase
    .from("powers_of_attorney")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  
  return data || [];
}

export async function getPowerOfAttorney(id: string): Promise<PowerOfAttorney | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data } = await supabase
    .from("powers_of_attorney")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  return data;
}

export async function getNextPowerOfAttorneyNumber(): Promise<string> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return "1";
  
  const year = new Date().getFullYear();
  
  const { data } = await supabase
    .from("powers_of_attorney")
    .select("number")
    .eq("company_id", companyId)
    .ilike("number", `%/${year}`)
    .order("created_at", { ascending: false })
    .limit(1);
  
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].number.split("/")[0] || "0");
    return `${lastNum + 1}/${year}`;
  }
  
  return `1/${year}`;
}

export async function createPowerOfAttorney(
  poa: Omit<PowerOfAttorney, "id" | "company_id" | "created_at">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { data, error } = await supabase
    .from("powers_of_attorney")
    .insert({
      ...poa,
      company_id: companyId,
    })
    .select("id")
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, id: data?.id };
}

export async function updatePowerOfAttorney(
  id: string,
  updates: Partial<PowerOfAttorney>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("powers_of_attorney")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deletePowerOfAttorney(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("powers_of_attorney")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Генерация данных для новой доверенности
// ============================================

export async function preparePowerOfAttorney(): Promise<Partial<PowerOfAttorney> | null> {
  const settings = await getAccountingSettings();
  if (!settings) return null;
  
  const nextNumber = await getNextPowerOfAttorneyNumber();
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 15); // Стандартный срок 15 дней
  
  return {
    number: nextNumber,
    issue_date: today.toISOString().split("T")[0],
    valid_until: validUntil.toISOString().split("T")[0],
    
    organization_name: settings.full_name,
    organization_inn: settings.inn,
    organization_kpp: settings.kpp || undefined,
    organization_address: settings.legal_address || undefined,
    organization_okpo: settings.okpo || undefined,
    
    bank_name: settings.bank_name || undefined,
    bank_account: settings.bank_account || undefined,
    
    items: [],
    status: "draft",
  };
}

// ============================================
// Числительные для печати
// ============================================

function _numberToWordsRuInternal(num: number): string {
  const ones = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", 
                 "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", 
                "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот",
                    "шестьсот", "семьсот", "восемьсот", "девятьсот"];
  
  if (num === 0) return "ноль";
  if (num < 0) return "минус " + _numberToWordsRuInternal(-num);
  
  let result = "";
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) result += "одна тысяча ";
    else if (thousands === 2) result += "две тысячи ";
    else if (thousands >= 3 && thousands <= 4) result += ones[thousands] + " тысячи ";
    else result += ones[thousands] + " тысяч ";
    num %= 1000;
  }
  
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)] + " ";
    num %= 100;
  }
  
  if (num >= 10 && num < 20) {
    result += teens[num - 10] + " ";
    num = 0;
  } else if (num >= 20) {
    result += tens[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  
  if (num > 0) {
    result += ones[num] + " ";
  }
  
  return result.trim();
}
