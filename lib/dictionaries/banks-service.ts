"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { Bank, BankInput } from "@/types/bank";
import { logger } from "@/lib/logger";

export async function getBanks(): Promise<Bank[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("banks")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) {
    logger.error("Error fetching banks:", error);
    return [];
  }

  return data || [];
}

export async function getBanksStats(): Promise<{
  total: number;
  active: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return { total: 0, active: 0 };

  const { data, error } = await supabase
    .from("banks")
    .select("id, is_active")
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error fetching banks stats:", error);
    return { total: 0, active: 0 };
  }

  const total = data?.length || 0;
  const active = data?.filter((b) => b.is_active).length || 0;

  return { total, active };
}

export async function createBank(
  input: BankInput
): Promise<{ success: boolean; data?: Bank; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Проверка уникальности БИК
  const { data: existing } = await supabase
    .from("banks")
    .select("id")
    .eq("company_id", companyId)
    .eq("bik", input.bik)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Банк с таким БИК уже существует" };
  }

  const { data, error } = await supabase
    .from("banks")
    .insert({
      ...input,
      company_id: companyId,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating bank:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function updateBank(
  id: string,
  input: Partial<BankInput>
): Promise<{ success: boolean; data?: Bank; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Если меняем БИК, проверяем уникальность
  if (input.bik) {
    const { data: existing } = await supabase
      .from("banks")
      .select("id")
      .eq("company_id", companyId)
      .eq("bik", input.bik)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Банк с таким БИК уже существует" };
    }
  }

  const { data, error } = await supabase
    .from("banks")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating bank:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteBank(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("banks")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting bank:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleBankActive(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем текущий статус
  const { data: bank } = await supabase
    .from("banks")
    .select("is_active")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (!bank) {
    return { success: false, error: "Банк не найден" };
  }

  const { error } = await supabase
    .from("banks")
    .update({ is_active: !bank.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error toggling bank active:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
