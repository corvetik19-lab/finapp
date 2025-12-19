"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type { TenderExpense, TenderExpenseSummary } from "./tender-expenses-types";
import { logger } from "@/lib/logger";

// Re-export types for consumers
export type { TenderExpense, TenderExpenseSummary };

// ============================================
// CRUD операции
// ============================================

export async function getTenderExpenses(tenderId: string): Promise<TenderExpense[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data } = await supabase
    .from("tender_expenses")
    .select("*")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("expense_date", { ascending: false });
  
  return data || [];
}

export async function addTenderExpense(
  expense: Omit<TenderExpense, "id" | "company_id" | "created_at" | "updated_at">
): Promise<{ success: boolean; expense?: TenderExpense; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { data, error } = await supabase
    .from("tender_expenses")
    .insert({
      ...expense,
      company_id: companyId,
    })
    .select()
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, expense: data };
}

export async function updateTenderExpense(
  id: string,
  updates: Partial<TenderExpense>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("tender_expenses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deleteTenderExpense(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("tender_expenses")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Привязка документа к тендеру
// ============================================

export async function linkDocumentToTender(
  documentId: string,
  tenderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Получаем документ
  const { data: doc } = await supabase
    .from("accounting_documents")
    .select("*, counterparty:accounting_counterparties(name)")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .single();
  
  if (!doc) {
    return { success: false, error: "Документ не найден" };
  }
  
  // Обновляем связь в документе
  const { error: updateError } = await supabase
    .from("accounting_documents")
    .update({ tender_id: tenderId })
    .eq("id", documentId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Если это входящий документ (расход) - создаём запись расхода
  if (doc.direction === "incoming" && doc.status === "paid") {
    const cpData = doc.counterparty as unknown;
    const cp = (Array.isArray(cpData) ? cpData[0] : cpData) as { name?: string } | undefined;
    
    const { error: expenseError } = await supabase
      .from("tender_expenses")
      .insert({
        company_id: companyId,
        tender_id: tenderId,
        source_type: "document",
        document_id: documentId,
        expense_date: doc.document_date,
        description: `${doc.document_type.toUpperCase()} №${doc.document_number}`,
        amount: doc.total,
        category: categorizeDocument(doc.document_type),
        counterparty_id: doc.counterparty_id,
        counterparty_name: cp?.name,
      });
    
    if (expenseError) {
      logger.error("Ошибка создания расхода:", expenseError);
    }
  }
  
  return { success: true };
}

export async function unlinkDocumentFromTender(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Убираем связь в документе
  const { error: updateError } = await supabase
    .from("accounting_documents")
    .update({ tender_id: null })
    .eq("id", documentId)
    .eq("company_id", companyId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Удаляем связанный расход
  await supabase
    .from("tender_expenses")
    .delete()
    .eq("document_id", documentId)
    .eq("company_id", companyId);
  
  return { success: true };
}

// ============================================
// Сводка по тендеру
// ============================================

export async function getTenderExpenseSummary(tenderId: string): Promise<TenderExpenseSummary | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  // Получаем тендер
  const { data: tender } = await supabase
    .from("tenders")
    .select("id, purchase_number, subject, contract_price")
    .eq("id", tenderId)
    .eq("company_id", companyId)
    .single();
  
  if (!tender) return null;
  
  // Получаем расходы
  const { data: expenses } = await supabase
    .from("tender_expenses")
    .select("category, amount")
    .eq("tender_id", tenderId)
    .eq("company_id", companyId);
  
  // Группируем по категориям
  const byCategory = {
    materials: 0,
    services: 0,
    logistics: 0,
    salary: 0,
    overhead: 0,
    other: 0,
  };
  
  expenses?.forEach(exp => {
    const cat = exp.category as keyof typeof byCategory;
    if (cat in byCategory) {
      byCategory[cat] += exp.amount;
    }
  });
  
  const totalExpenses = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const contractPrice = tender.contract_price || 0;
  const grossProfit = contractPrice - totalExpenses;
  const marginPercent = contractPrice > 0 ? (grossProfit / contractPrice) * 100 : 0;
  
  return {
    tender_id: tender.id,
    purchase_number: tender.purchase_number,
    subject: tender.subject,
    contract_price: contractPrice,
    ...byCategory,
    total_expenses: totalExpenses,
    gross_profit: grossProfit,
    margin_percent: marginPercent,
  };
}

// ============================================
// Список тендеров с расходами
// ============================================

export async function getTendersWithExpenses(): Promise<TenderExpenseSummary[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  // Получаем тендеры
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, purchase_number, subject, contract_price, status")
    .eq("company_id", companyId)
    .in("status", ["won", "in_progress", "completed"])
    .order("created_at", { ascending: false });
  
  if (!tenders || tenders.length === 0) return [];
  
  // Получаем все расходы
  const { data: expenses } = await supabase
    .from("tender_expenses")
    .select("tender_id, category, amount")
    .eq("company_id", companyId)
    .in("tender_id", tenders.map(t => t.id));
  
  // Группируем расходы по тендерам
  const expensesByTender = new Map<string, typeof expenses>();
  expenses?.forEach(exp => {
    const list = expensesByTender.get(exp.tender_id) || [];
    list.push(exp);
    expensesByTender.set(exp.tender_id, list);
  });
  
  // Формируем сводки
  return tenders.map(tender => {
    const tenderExpenses = expensesByTender.get(tender.id) || [];
    
    const byCategory = {
      materials: 0,
      services: 0,
      logistics: 0,
      salary: 0,
      overhead: 0,
      other: 0,
    };
    
    tenderExpenses.forEach(exp => {
      const cat = exp.category as keyof typeof byCategory;
      if (cat in byCategory) {
        byCategory[cat] += exp.amount;
      }
    });
    
    const totalExpenses = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const contractPrice = tender.contract_price || 0;
    const grossProfit = contractPrice - totalExpenses;
    const marginPercent = contractPrice > 0 ? (grossProfit / contractPrice) * 100 : 0;
    
    return {
      tender_id: tender.id,
      purchase_number: tender.purchase_number,
      subject: tender.subject,
      contract_price: contractPrice,
      ...byCategory,
      total_expenses: totalExpenses,
      gross_profit: grossProfit,
      margin_percent: marginPercent,
    };
  });
}

// ============================================
// Вспомогательные функции
// ============================================

function categorizeDocument(docType: string): TenderExpense["category"] {
  const mapping: Record<string, TenderExpense["category"]> = {
    waybill: "materials",
    act: "services",
    invoice: "other",
    upd: "materials",
  };
  return mapping[docType] || "other";
}

// Константы экспортируются из ./tender-expenses-types.ts
