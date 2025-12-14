"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  SupplierContract,
  CreateContractInput,
  ContractStatus,
} from "./types";
import { logActivity } from "./tasks-service";

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

// =====================================================
// CRUD операции для договоров
// =====================================================

// Получить договоры по поставщику
export async function getSupplierContracts(
  supplierId: string
): Promise<SupplierContract[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_contracts")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("end_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier contracts:", error);
    return [];
  }

  return (data || []) as SupplierContract[];
}

// Получить все активные договоры
export async function getActiveContracts(): Promise<SupplierContract[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_contracts")
    .select(`
      *,
      supplier:suppliers(id, name)
    `)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("end_date", { ascending: true });

  if (error) {
    console.error("Error fetching active contracts:", error);
    return [];
  }

  return (data || []) as SupplierContract[];
}

// Получить истекающие договоры
export async function getExpiringContracts(
  daysAhead = 30
): Promise<SupplierContract[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from("supplier_contracts")
    .select(`
      *,
      supplier:suppliers(id, name)
    `)
    .eq("company_id", companyId)
    .eq("status", "active")
    .lte("end_date", futureDate.toISOString().split("T")[0])
    .gte("end_date", new Date().toISOString().split("T")[0])
    .order("end_date", { ascending: true });

  if (error) {
    console.error("Error fetching expiring contracts:", error);
    return [];
  }

  return (data || []) as SupplierContract[];
}

// Создать договор
export async function createContract(
  input: CreateContractInput
): Promise<{ success: boolean; contract?: SupplierContract; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("supplier_contracts")
    .insert({
      company_id: companyId,
      supplier_id: input.supplier_id,
      contract_number: input.contract_number,
      title: input.title,
      description: input.description,
      contract_type: input.contract_type || "supply",
      start_date: input.start_date,
      end_date: input.end_date,
      signed_date: input.signed_date,
      payment_terms: input.payment_terms,
      payment_terms_custom: input.payment_terms_custom,
      amount: input.amount,
      currency: input.currency || "RUB",
      reminder_days: input.reminder_days || 30,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating contract:", error);
    return { success: false, error: "Ошибка создания договора" };
  }

  // Логируем активность
  await logActivity(
    input.supplier_id,
    "contract_signed",
    `Добавлен договор: ${input.title}`,
    { contract_id: data.id }
  );

  return { success: true, contract: data as SupplierContract };
}

// Обновить договор
export async function updateContract(
  contractId: string,
  input: Partial<CreateContractInput> & { status?: ContractStatus }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_contracts")
    .update(input)
    .eq("id", contractId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating contract:", error);
    return { success: false, error: "Ошибка обновления договора" };
  }

  return { success: true };
}

// Удалить договор
export async function deleteContract(
  contractId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_contracts")
    .delete()
    .eq("id", contractId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting contract:", error);
    return { success: false, error: "Ошибка удаления договора" };
  }

  return { success: true };
}

// Изменить статус договора
export async function updateContractStatus(
  contractId: string,
  status: ContractStatus
): Promise<{ success: boolean; error?: string }> {
  return updateContract(contractId, { status });
}
