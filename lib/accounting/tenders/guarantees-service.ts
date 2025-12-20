"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  TenderGuarantee,
  CreateGuaranteeInput,
} from "./types";

export async function getTenderGuarantees(tenderId: string): Promise<TenderGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("tender_guarantees")
    .select("*")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("valid_until", { ascending: true });

  if (error) {
    logger.error("Error fetching tender guarantees:", error);
    return [];
  }

  return data || [];
}

export async function getAllActiveGuarantees(): Promise<TenderGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("tender_guarantees")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["pending", "active"])
    .order("valid_until", { ascending: true });

  if (error) {
    logger.error("Error fetching active guarantees:", error);
    return [];
  }

  return data || [];
}

export async function createGuarantee(
  input: CreateGuaranteeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tender_guarantees")
    .insert({
      company_id: companyId,
      tender_id: input.tender_id,
      guarantee_type: input.guarantee_type,
      guarantee_form: input.guarantee_form,
      amount: input.amount,
      currency: input.currency || "RUB",
      bank_name: input.bank_name,
      guarantee_number: input.guarantee_number,
      issue_date: input.issue_date,
      valid_from: input.valid_from,
      valid_until: input.valid_until,
      bank_account_id: input.bank_account_id,
      notes: input.notes,
      status: "pending",
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating guarantee:", error);
    return { success: false, error: "Ошибка создания гарантии" };
  }

  return { success: true, id: data.id };
}

export async function updateGuarantee(
  guaranteeId: string,
  input: Partial<CreateGuaranteeInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_guarantees")
    .update({
      guarantee_type: input.guarantee_type,
      guarantee_form: input.guarantee_form,
      amount: input.amount,
      currency: input.currency,
      bank_name: input.bank_name,
      guarantee_number: input.guarantee_number,
      issue_date: input.issue_date,
      valid_from: input.valid_from,
      valid_until: input.valid_until,
      bank_account_id: input.bank_account_id,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guaranteeId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating guarantee:", error);
    return { success: false, error: "Ошибка обновления гарантии" };
  }

  return { success: true };
}

export async function activateGuarantee(
  guaranteeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_guarantees")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", guaranteeId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    logger.error("Error activating guarantee:", error);
    return { success: false, error: "Ошибка активации гарантии" };
  }

  return { success: true };
}

export async function returnGuarantee(
  guaranteeId: string,
  returnDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_guarantees")
    .update({
      status: "returned",
      return_date: returnDate || new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", guaranteeId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error returning guarantee:", error);
    return { success: false, error: "Ошибка возврата гарантии" };
  }

  return { success: true };
}

export async function claimGuarantee(
  guaranteeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_guarantees")
    .update({
      status: "claimed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", guaranteeId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error claiming guarantee:", error);
    return { success: false, error: "Ошибка востребования гарантии" };
  }

  return { success: true };
}

export async function deleteGuarantee(
  guaranteeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_guarantees")
    .delete()
    .eq("id", guaranteeId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    logger.error("Error deleting guarantee:", error);
    return { success: false, error: "Ошибка удаления гарантии" };
  }

  return { success: true };
}

// Получить истекающие гарантии
export async function getExpiringGuarantees(daysAhead: number = 30): Promise<TenderGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from("tender_guarantees")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["pending", "active"])
    .gte("valid_until", today.toISOString().split("T")[0])
    .lte("valid_until", futureDate.toISOString().split("T")[0])
    .order("valid_until", { ascending: true });

  if (error) {
    logger.error("Error fetching expiring guarantees:", error);
    return [];
  }

  return data || [];
}

// Пометить истёкшие гарантии
export async function markExpiredGuarantees(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 0;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tender_guarantees")
    .update({ status: "expired" })
    .eq("company_id", companyId)
    .in("status", ["pending", "active"])
    .lt("valid_until", today)
    .select();

  if (error) {
    logger.error("Error marking expired guarantees:", error);
    return 0;
  }

  return data?.length || 0;
}

// Сводка по гарантиям
export async function getGuaranteesSummary(): Promise<{
  totalActive: number;
  totalAmount: number;
  expiringCount: number;
  expiringAmount: number;
  byType: Record<string, { count: number; amount: number }>;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      totalActive: 0,
      totalAmount: 0,
      expiringCount: 0,
      expiringAmount: 0,
      byType: {},
    };
  }

  const { data: activeGuarantees } = await supabase
    .from("tender_guarantees")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["pending", "active"]);

  const guarantees = activeGuarantees || [];
  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const expiringGuarantees = guarantees.filter(
    (g) => new Date(g.valid_until) <= thirtyDaysLater
  );

  const byType: Record<string, { count: number; amount: number }> = {};
  for (const g of guarantees) {
    if (!byType[g.guarantee_type]) {
      byType[g.guarantee_type] = { count: 0, amount: 0 };
    }
    byType[g.guarantee_type].count++;
    byType[g.guarantee_type].amount += g.amount || 0;
  }

  return {
    totalActive: guarantees.length,
    totalAmount: guarantees.reduce((sum, g) => sum + (g.amount || 0), 0),
    expiringCount: expiringGuarantees.length,
    expiringAmount: expiringGuarantees.reduce((sum, g) => sum + (g.amount || 0), 0),
    byType,
  };
}
