"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  ReconciliationAct,
  ReconciliationItem,
  ReconciliationStatus,
  CreateReconciliationActInput,
  ReconciliationActCalculated,
} from "./types";

export async function getReconciliationActs(filters?: {
  status?: ReconciliationStatus;
  counterpartyId?: string;
  periodStart?: string;
  periodEnd?: string;
}): Promise<ReconciliationAct[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_reconciliation_acts")
    .select(`
      *,
      counterparty:accounting_counterparties(id, name, inn)
    `)
    .eq("company_id", companyId)
    .order("period_end", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.counterpartyId) {
    query = query.eq("counterparty_id", filters.counterpartyId);
  }
  if (filters?.periodStart) {
    query = query.gte("period_start", filters.periodStart);
  }
  if (filters?.periodEnd) {
    query = query.lte("period_end", filters.periodEnd);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching reconciliation acts:", error);
    return [];
  }

  return (data || []).map(act => ({
    ...act,
    counterparty: Array.isArray(act.counterparty) ? act.counterparty[0] : act.counterparty,
  }));
}

export async function getReconciliationAct(id: string): Promise<ReconciliationAct | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: act, error } = await supabase
    .from("accounting_reconciliation_acts")
    .select(`
      *,
      counterparty:accounting_counterparties(id, name, inn)
    `)
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error || !act) {
    logger.error("Error fetching reconciliation act:", error);
    return null;
  }

  // Получаем операции
  const { data: items } = await supabase
    .from("accounting_reconciliation_items")
    .select("*")
    .eq("act_id", id)
    .order("operation_date", { ascending: true });

  return {
    ...act,
    counterparty: Array.isArray(act.counterparty) ? act.counterparty[0] : act.counterparty,
    items: items || [],
  };
}

export async function getNextReconciliationActNumber(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const currentYear = new Date().getFullYear();

  const { data } = await supabase
    .from("accounting_reconciliation_acts")
    .select("act_number")
    .eq("company_id", companyId)
    .gte("created_at", `${currentYear}-01-01`)
    .order("act_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.act_number || 0) + 1;
}

export async function createReconciliationAct(
  input: CreateReconciliationActInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();
  const actNumber = await getNextReconciliationActNumber();

  // Рассчитываем обороты на основе документов
  const calculated = await calculateReconciliationData(
    companyId,
    input.counterparty_id,
    input.period_start,
    input.period_end,
    input.opening_balance_debit || 0
  );

  const { data, error } = await supabase
    .from("accounting_reconciliation_acts")
    .insert({
      company_id: companyId,
      act_number: actNumber,
      counterparty_id: input.counterparty_id,
      period_start: input.period_start,
      period_end: input.period_end,
      opening_balance_debit: input.opening_balance_debit || 0,
      opening_balance_credit: input.opening_balance_credit || 0,
      our_debit: calculated.our_debit,
      our_credit: calculated.our_credit,
      their_debit: calculated.their_debit,
      their_credit: calculated.their_credit,
      closing_balance_debit: calculated.closing_balance_debit,
      closing_balance_credit: calculated.closing_balance_credit,
      discrepancy: calculated.discrepancy,
      status: "draft",
      notes: input.notes,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error("Error creating reconciliation act:", error);
    return { success: false, error: "Ошибка создания акта сверки" };
  }

  // Добавляем операции
  if (calculated.items.length > 0) {
    const items = calculated.items.map(item => ({
      act_id: data.id,
      operation_date: item.operation_date,
      document_type: item.document_type,
      document_number: item.document_number,
      document_date: item.document_date,
      description: item.description,
      our_debit: item.our_debit,
      our_credit: item.our_credit,
      their_debit: item.their_debit,
      their_credit: item.their_credit,
      document_id: item.document_id,
    }));

    const { error: itemsError } = await supabase
      .from("accounting_reconciliation_items")
      .insert(items);

    if (itemsError) {
      logger.error("Error creating reconciliation items:", itemsError);
    }
  }

  return { success: true, id: data.id };
}

async function calculateReconciliationData(
  companyId: string,
  counterpartyId: string,
  periodStart: string,
  periodEnd: string,
  openingDebit: number
): Promise<ReconciliationActCalculated> {
  const supabase = await createRSCClient();

  // Получаем документы с этим контрагентом за период
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("counterparty_id", counterpartyId)
    .gte("document_date", periodStart)
    .lte("document_date", periodEnd)
    .is("deleted_at", null)
    .order("document_date", { ascending: true });

  const items: ReconciliationItem[] = [];
  let ourDebit = 0;
  let ourCredit = 0;

  for (const doc of documents || []) {
    const isIncome = ["invoice", "act", "upd"].includes(doc.document_type);
    const amount = doc.total || 0;

    if (isIncome) {
      ourDebit += amount;
    } else {
      ourCredit += amount;
    }

    items.push({
      id: '',
      act_id: '',
      operation_date: doc.document_date,
      document_type: doc.document_type,
      document_number: doc.document_number,
      document_date: doc.document_date,
      description: doc.description || '',
      our_debit: isIncome ? amount : 0,
      our_credit: isIncome ? 0 : amount,
      their_debit: 0,
      their_credit: 0,
      document_id: doc.id,
      created_at: new Date().toISOString(),
    });
  }

  // Рассчитываем конечное сальдо
  const closingDebit = openingDebit + ourDebit - ourCredit;
  const closingCredit = closingDebit < 0 ? Math.abs(closingDebit) : 0;
  const finalClosingDebit = closingDebit > 0 ? closingDebit : 0;

  return {
    our_debit: ourDebit,
    our_credit: ourCredit,
    their_debit: 0,
    their_credit: 0,
    closing_balance_debit: finalClosingDebit,
    closing_balance_credit: closingCredit,
    discrepancy: 0,
    items,
  };
}

export async function updateReconciliationAct(
  id: string,
  input: Partial<CreateReconciliationActInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_reconciliation_acts")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating reconciliation act:", error);
    return { success: false, error: "Ошибка обновления акта сверки" };
  }

  return { success: true };
}

export async function sendReconciliationAct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_reconciliation_acts")
    .update({
      status: "sent",
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error sending reconciliation act:", error);
    return { success: false, error: "Ошибка отправки акта сверки" };
  }

  return { success: true };
}

export async function confirmReconciliationAct(
  id: string,
  signedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_reconciliation_acts")
    .update({
      status: "confirmed",
      their_signed_by: signedBy,
      their_signed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error confirming reconciliation act:", error);
    return { success: false, error: "Ошибка подтверждения акта сверки" };
  }

  return { success: true };
}

export async function disputeReconciliationAct(
  id: string,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_reconciliation_acts")
    .update({
      status: "disputed",
      dispute_comment: comment,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error disputing reconciliation act:", error);
    return { success: false, error: "Ошибка оспаривания акта сверки" };
  }

  return { success: true };
}

export async function deleteReconciliationAct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_reconciliation_acts")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error deleting reconciliation act:", error);
    return { success: false, error: "Ошибка удаления акта сверки" };
  }

  return { success: true };
}
