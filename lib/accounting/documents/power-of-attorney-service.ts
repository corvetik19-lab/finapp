"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  PowerOfAttorney,
  POAStatus,
  CreatePOAInput,
  CreatePOAItemInput,
} from "./types";

export async function getPowerOfAttorneys(filters?: {
  status?: POAStatus;
  startDate?: string;
  endDate?: string;
  counterpartyId?: string;
  tenderId?: string;
}): Promise<PowerOfAttorney[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_power_of_attorney")
    .select("*")
    .eq("company_id", companyId)
    .order("poa_date", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("poa_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("poa_date", filters.endDate);
  }
  if (filters?.counterpartyId) {
    query = query.eq("counterparty_id", filters.counterpartyId);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching power of attorneys:", error);
    return [];
  }

  return data || [];
}

export async function getPowerOfAttorney(id: string): Promise<PowerOfAttorney | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: poa, error } = await supabase
    .from("accounting_power_of_attorney")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error || !poa) {
    logger.error("Error fetching power of attorney:", error);
    return null;
  }

  // Получаем позиции
  const { data: items } = await supabase
    .from("accounting_poa_items")
    .select("*")
    .eq("poa_id", id)
    .order("position", { ascending: true });

  return {
    ...poa,
    items: items || [],
  };
}

export async function getNextPOANumber(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data } = await supabase
    .from("accounting_power_of_attorney")
    .select("poa_number")
    .eq("company_id", companyId)
    .gte("poa_date", startOfYear)
    .order("poa_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.poa_number || 0) + 1;
}

export async function createPowerOfAttorney(
  input: CreatePOAInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();
  const poaNumber = await getNextPOANumber();

  const { data: poa, error } = await supabase
    .from("accounting_power_of_attorney")
    .insert({
      company_id: companyId,
      poa_number: poaNumber,
      poa_date: input.poa_date,
      valid_until: input.valid_until,
      employee_id: input.employee_id,
      employee_name: input.employee_name,
      employee_position: input.employee_position,
      passport_series: input.passport_series,
      passport_number: input.passport_number,
      passport_issued_by: input.passport_issued_by,
      passport_issued_date: input.passport_issued_date,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      document_name: input.document_name,
      document_number: input.document_number,
      document_date: input.document_date,
      tender_id: input.tender_id,
      notes: input.notes,
      status: "active",
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error || !poa) {
    logger.error("Error creating power of attorney:", error);
    return { success: false, error: "Ошибка создания доверенности" };
  }

  // Создаём позиции (ТМЦ)
  if (input.items && input.items.length > 0) {
    const items = input.items.map((item, index) => ({
      poa_id: poa.id,
      position: index + 1,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("accounting_poa_items")
      .insert(items);

    if (itemsError) {
      logger.error("Error creating POA items:", itemsError);
    }
  }

  return { success: true, id: poa.id };
}

export async function updatePowerOfAttorney(
  id: string,
  input: Partial<CreatePOAInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_power_of_attorney")
    .update({
      poa_date: input.poa_date,
      valid_until: input.valid_until,
      employee_id: input.employee_id,
      employee_name: input.employee_name,
      employee_position: input.employee_position,
      passport_series: input.passport_series,
      passport_number: input.passport_number,
      passport_issued_by: input.passport_issued_by,
      passport_issued_date: input.passport_issued_date,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      document_name: input.document_name,
      document_number: input.document_number,
      document_date: input.document_date,
      tender_id: input.tender_id,
      notes: input.notes,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating power of attorney:", error);
    return { success: false, error: "Ошибка обновления доверенности" };
  }

  return { success: true };
}

export async function addPOAItem(
  poaId: string,
  item: CreatePOAItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();

  // Получаем следующую позицию
  const { data: lastItem } = await supabase
    .from("accounting_poa_items")
    .select("position")
    .eq("poa_id", poaId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (lastItem?.position || 0) + 1;

  const { data, error } = await supabase
    .from("accounting_poa_items")
    .insert({
      poa_id: poaId,
      position,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error adding POA item:", error);
    return { success: false, error: "Ошибка добавления позиции" };
  }

  return { success: true, id: data.id };
}

export async function deletePOAItem(
  poaId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("accounting_poa_items")
    .delete()
    .eq("id", itemId)
    .eq("poa_id", poaId);

  if (error) {
    logger.error("Error deleting POA item:", error);
    return { success: false, error: "Ошибка удаления позиции" };
  }

  return { success: true };
}

export async function markPOAAsUsed(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_power_of_attorney")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "active");

  if (error) {
    logger.error("Error marking POA as used:", error);
    return { success: false, error: "Ошибка пометки доверенности" };
  }

  return { success: true };
}

export async function cancelPOA(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_power_of_attorney")
    .update({
      status: "cancelled",
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error cancelling POA:", error);
    return { success: false, error: "Ошибка аннулирования доверенности" };
  }

  return { success: true };
}

export async function deletePowerOfAttorney(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Можно удалять только активные и неиспользованные
  const { error } = await supabase
    .from("accounting_power_of_attorney")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "active");

  if (error) {
    logger.error("Error deleting power of attorney:", error);
    return { success: false, error: "Ошибка удаления доверенности" };
  }

  return { success: true };
}

// Получить просроченные доверенности
export async function getExpiredPOAs(): Promise<PowerOfAttorney[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("accounting_power_of_attorney")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .lt("valid_until", today);

  if (error) {
    logger.error("Error fetching expired POAs:", error);
    return [];
  }

  return data || [];
}

// Автоматическая пометка просроченных доверенностей
export async function markExpiredPOAs(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 0;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("accounting_power_of_attorney")
    .update({ status: "expired" })
    .eq("company_id", companyId)
    .eq("status", "active")
    .lt("valid_until", today)
    .select();

  if (error) {
    logger.error("Error marking expired POAs:", error);
    return 0;
  }

  return data?.length || 0;
}
