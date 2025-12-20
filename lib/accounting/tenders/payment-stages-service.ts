"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  TenderPaymentStage,
  PaymentStageStatus,
  CreatePaymentStageInput,
} from "./types";

export async function getPaymentStages(tenderId: string): Promise<TenderPaymentStage[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("tender_payment_stages")
    .select("*")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("stage_number", { ascending: true });

  if (error) {
    logger.error("Error fetching payment stages:", error);
    return [];
  }

  return data || [];
}

export async function getNextStageNumber(tenderId: string): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const { data } = await supabase
    .from("tender_payment_stages")
    .select("stage_number")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("stage_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.stage_number || 0) + 1;
}

export async function createPaymentStage(
  input: CreatePaymentStageInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const stageNumber = await getNextStageNumber(input.tender_id);

  const { data, error } = await supabase
    .from("tender_payment_stages")
    .insert({
      company_id: companyId,
      tender_id: input.tender_id,
      stage_number: stageNumber,
      name: input.name,
      description: input.description,
      amount: input.amount,
      percentage: input.percentage,
      condition_type: input.condition_type,
      condition_description: input.condition_description,
      planned_date: input.planned_date,
      due_date: input.due_date,
      notes: input.notes,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating payment stage:", error);
    return { success: false, error: "Ошибка создания этапа оплаты" };
  }

  return { success: true, id: data.id };
}

export async function updatePaymentStage(
  stageId: string,
  input: Partial<CreatePaymentStageInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_payment_stages")
    .update({
      name: input.name,
      description: input.description,
      amount: input.amount,
      percentage: input.percentage,
      condition_type: input.condition_type,
      condition_description: input.condition_description,
      planned_date: input.planned_date,
      due_date: input.due_date,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stageId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating payment stage:", error);
    return { success: false, error: "Ошибка обновления этапа оплаты" };
  }

  return { success: true };
}

export async function updateStageStatus(
  stageId: string,
  status: PaymentStageStatus,
  actualDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (actualDate) {
    updateData.actual_date = actualDate;
  }

  const { error } = await supabase
    .from("tender_payment_stages")
    .update(updateData)
    .eq("id", stageId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating stage status:", error);
    return { success: false, error: "Ошибка обновления статуса" };
  }

  return { success: true };
}

export async function linkInvoiceToStage(
  stageId: string,
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_payment_stages")
    .update({
      invoice_id: invoiceId,
      status: "invoiced",
      updated_at: new Date().toISOString(),
    })
    .eq("id", stageId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error linking invoice to stage:", error);
    return { success: false, error: "Ошибка привязки счёта" };
  }

  return { success: true };
}

export async function recordPayment(
  stageId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем текущий этап
  const { data: stage } = await supabase
    .from("tender_payment_stages")
    .select("amount, paid_amount")
    .eq("id", stageId)
    .eq("company_id", companyId)
    .single();

  if (!stage) {
    return { success: false, error: "Этап не найден" };
  }

  const newPaidAmount = (stage.paid_amount || 0) + amount;
  const newStatus: PaymentStageStatus = 
    newPaidAmount >= stage.amount ? "paid" : 
    newPaidAmount > 0 ? "partial" : "invoiced";

  const { error } = await supabase
    .from("tender_payment_stages")
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      actual_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stageId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error recording payment:", error);
    return { success: false, error: "Ошибка записи оплаты" };
  }

  return { success: true };
}

export async function deletePaymentStage(
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_payment_stages")
    .delete()
    .eq("id", stageId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    logger.error("Error deleting payment stage:", error);
    return { success: false, error: "Ошибка удаления этапа оплаты" };
  }

  return { success: true };
}

// Получить просроченные этапы
export async function getOverdueStages(): Promise<TenderPaymentStage[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tender_payment_stages")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["pending", "invoiced", "partial"])
    .lt("due_date", today);

  if (error) {
    logger.error("Error fetching overdue stages:", error);
    return [];
  }

  return data || [];
}

// Пометить просроченные этапы
export async function markOverdueStages(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 0;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tender_payment_stages")
    .update({ status: "overdue" })
    .eq("company_id", companyId)
    .in("status", ["pending", "invoiced", "partial"])
    .lt("due_date", today)
    .select();

  if (error) {
    logger.error("Error marking overdue stages:", error);
    return 0;
  }

  return data?.length || 0;
}

// Сводка по этапам оплаты тендера
export async function getPaymentStagesSummary(tenderId: string): Promise<{
  totalStages: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}> {
  const stages = await getPaymentStages(tenderId);

  const totalAmount = stages.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = stages.reduce((sum, s) => sum + s.paid_amount, 0);
  const pendingAmount = stages
    .filter(s => ["pending", "invoiced", "partial"].includes(s.status))
    .reduce((sum, s) => sum + (s.amount - s.paid_amount), 0);
  const overdueAmount = stages
    .filter(s => s.status === "overdue")
    .reduce((sum, s) => sum + (s.amount - s.paid_amount), 0);

  return {
    totalStages: stages.length,
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
  };
}
