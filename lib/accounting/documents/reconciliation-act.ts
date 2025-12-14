"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { getAccountingSettings } from "../service";

// ============================================
// Типы для акта сверки
// ============================================

export interface ReconciliationOperation {
  date: string;
  document_number: string;
  document_type: string;
  description: string;
  debit: number;   // Наша задолженность (мы должны)
  credit: number;  // Их задолженность (нам должны)
  balance: number; // Сальдо
}

export interface ReconciliationAct {
  id?: string;
  company_id: string;
  counterparty_id: string;
  
  // Период
  period_start: string;
  period_end: string;
  
  // Контрагент
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  
  // Наша организация
  our_name: string;
  our_inn?: string;
  our_kpp?: string;
  
  // Сальдо
  opening_balance_debit: number;  // Входящее сальдо (мы должны)
  opening_balance_credit: number; // Входящее сальдо (нам должны)
  
  // Обороты
  turnover_debit: number;  // Оборот дебет
  turnover_credit: number; // Оборот кредит
  
  // Исходящее сальдо
  closing_balance_debit: number;
  closing_balance_credit: number;
  
  // Операции
  operations: ReconciliationOperation[];
  
  // Подписанты
  our_signatory?: string;
  our_signatory_position?: string;
  their_signatory?: string;
  their_signatory_position?: string;
  
  status: "draft" | "sent" | "confirmed" | "disputed";
  created_at: string;
}

// ============================================
// Генерация акта сверки
// ============================================

export async function generateReconciliationAct(
  counterpartyId: string,
  periodStart: string,
  periodEnd: string,
  openingDebit: number = 0,
  openingCredit: number = 0
): Promise<ReconciliationAct | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  // Получаем настройки
  const settings = await getAccountingSettings();
  if (!settings) return null;
  
  // Получаем контрагента
  const { data: counterparty } = await supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("id", counterpartyId)
    .eq("company_id", companyId)
    .single();
  
  if (!counterparty) return null;
  
  // Получаем документы за период
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("counterparty_id", counterpartyId)
    .gte("document_date", periodStart)
    .lte("document_date", periodEnd)
    .is("deleted_at", null)
    .order("document_date");
  
  // Формируем операции
  const operations: ReconciliationOperation[] = [];
  let runningBalance = openingCredit - openingDebit; // Положительное = нам должны
  let totalDebit = 0;
  let totalCredit = 0;
  
  documents?.forEach(doc => {
    let debit = 0;
    let credit = 0;
    
    // Исходящие документы (мы выставили) = нам должны = кредит
    // Входящие документы (нам выставили) = мы должны = дебет
    if (doc.direction === "outgoing") {
      credit = doc.total;
      runningBalance += credit;
      totalCredit += credit;
    } else {
      debit = doc.total;
      runningBalance -= debit;
      totalDebit += debit;
    }
    
    const docTypeLabels: Record<string, string> = {
      invoice: "Счёт",
      act: "Акт",
      waybill: "Накладная",
      upd: "УПД",
    };
    
    operations.push({
      date: doc.document_date,
      document_number: doc.document_number,
      document_type: doc.document_type,
      description: `${docTypeLabels[doc.document_type] || doc.document_type} №${doc.document_number}`,
      debit,
      credit,
      balance: runningBalance,
    });
  });
  
  // Исходящее сальдо
  const closingDebit = runningBalance < 0 ? Math.abs(runningBalance) : 0;
  const closingCredit = runningBalance > 0 ? runningBalance : 0;
  
  return {
    company_id: companyId,
    counterparty_id: counterpartyId,
    period_start: periodStart,
    period_end: periodEnd,
    
    counterparty_name: counterparty.name,
    counterparty_inn: counterparty.inn,
    counterparty_kpp: counterparty.kpp,
    
    our_name: settings.full_name,
    our_inn: settings.inn,
    our_kpp: settings.kpp || undefined,
    
    opening_balance_debit: openingDebit,
    opening_balance_credit: openingCredit,
    
    turnover_debit: totalDebit,
    turnover_credit: totalCredit,
    
    closing_balance_debit: closingDebit,
    closing_balance_credit: closingCredit,
    
    operations,
    
    our_signatory: undefined,
    our_signatory_position: undefined,
    
    status: "draft",
    created_at: new Date().toISOString(),
  };
}

// ============================================
// Сохранение акта сверки
// ============================================

export async function saveReconciliationAct(
  act: ReconciliationAct
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { data, error } = await supabase
    .from("reconciliation_acts")
    .insert({
      company_id: companyId,
      counterparty_id: act.counterparty_id,
      period_start: act.period_start,
      period_end: act.period_end,
      counterparty_name: act.counterparty_name,
      counterparty_inn: act.counterparty_inn,
      counterparty_kpp: act.counterparty_kpp,
      our_name: act.our_name,
      our_inn: act.our_inn,
      our_kpp: act.our_kpp,
      opening_balance_debit: act.opening_balance_debit,
      opening_balance_credit: act.opening_balance_credit,
      turnover_debit: act.turnover_debit,
      turnover_credit: act.turnover_credit,
      closing_balance_debit: act.closing_balance_debit,
      closing_balance_credit: act.closing_balance_credit,
      operations: act.operations,
      our_signatory: act.our_signatory,
      our_signatory_position: act.our_signatory_position,
      their_signatory: act.their_signatory,
      their_signatory_position: act.their_signatory_position,
      status: act.status,
    })
    .select("id")
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, id: data?.id };
}

// ============================================
// Получение актов сверки
// ============================================

export async function getReconciliationActs(
  counterpartyId?: string
): Promise<ReconciliationAct[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("reconciliation_acts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  
  if (counterpartyId) {
    query = query.eq("counterparty_id", counterpartyId);
  }
  
  const { data } = await query;
  
  return data || [];
}

export async function getReconciliationAct(id: string): Promise<ReconciliationAct | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data } = await supabase
    .from("reconciliation_acts")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  return data;
}

// ============================================
// Обновление статуса
// ============================================

export async function updateReconciliationActStatus(
  id: string,
  status: ReconciliationAct["status"],
  theirSignatory?: string,
  theirPosition?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const updates: Record<string, unknown> = { status };
  if (theirSignatory) updates.their_signatory = theirSignatory;
  if (theirPosition) updates.their_signatory_position = theirPosition;
  
  const { error } = await supabase
    .from("reconciliation_acts")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
