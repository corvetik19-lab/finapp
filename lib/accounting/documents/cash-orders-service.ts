"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  CashOrder,
  CashOrderType,
  CashOrderStatus,
  CreateCashOrderInput,
} from "./types";

export async function getCashOrders(filters?: {
  orderType?: CashOrderType;
  status?: CashOrderStatus;
  startDate?: string;
  endDate?: string;
  tenderId?: string;
}): Promise<CashOrder[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_cash_orders")
    .select("*")
    .eq("company_id", companyId)
    .order("order_date", { ascending: false });

  if (filters?.orderType) {
    query = query.eq("order_type", filters.orderType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("order_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("order_date", filters.endDate);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching cash orders:", error);
    return [];
  }

  return data || [];
}

export async function getCashOrder(id: string): Promise<CashOrder | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("accounting_cash_orders")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching cash order:", error);
    return null;
  }

  return data;
}

export async function getNextCashOrderNumber(orderType: CashOrderType): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data } = await supabase
    .from("accounting_cash_orders")
    .select("order_number")
    .eq("company_id", companyId)
    .eq("order_type", orderType)
    .gte("order_date", startOfYear)
    .order("order_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.order_number || 0) + 1;
}

export async function createCashOrder(
  input: CreateCashOrderInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const orderNumber = await getNextCashOrderNumber(input.order_type);

  const { data, error } = await supabase
    .from("accounting_cash_orders")
    .insert({
      company_id: companyId,
      order_type: input.order_type,
      order_number: orderNumber,
      order_date: input.order_date,
      amount: input.amount,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      basis: input.basis,
      appendix: input.appendix,
      received_from: input.received_from,
      issued_to: input.issued_to,
      bank_account_id: input.bank_account_id,
      tender_id: input.tender_id,
      document_id: input.document_id,
      notes: input.notes,
      status: "draft",
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating cash order:", error);
    return { success: false, error: "Ошибка создания кассового ордера" };
  }

  return { success: true, id: data.id };
}

export async function updateCashOrder(
  id: string,
  input: Partial<CreateCashOrderInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_cash_orders")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating cash order:", error);
    return { success: false, error: "Ошибка обновления кассового ордера" };
  }

  return { success: true };
}

export async function approveCashOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("accounting_cash_orders")
    .update({
      status: "approved",
      approved_by: user?.user?.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error approving cash order:", error);
    return { success: false, error: "Ошибка утверждения кассового ордера" };
  }

  return { success: true };
}

export async function cancelCashOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_cash_orders")
    .update({
      status: "cancelled",
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error cancelling cash order:", error);
    return { success: false, error: "Ошибка отмены кассового ордера" };
  }

  return { success: true };
}

export async function deleteCashOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Можно удалять только черновики
  const { error } = await supabase
    .from("accounting_cash_orders")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error deleting cash order:", error);
    return { success: false, error: "Ошибка удаления кассового ордера" };
  }

  return { success: true };
}

export async function getCashOrdersSummary(startDate?: string, endDate?: string): Promise<{
  pkoCount: number;
  pkoAmount: number;
  rkoCount: number;
  rkoAmount: number;
  balance: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { pkoCount: 0, pkoAmount: 0, rkoCount: 0, rkoAmount: 0, balance: 0 };
  }

  let query = supabase
    .from("accounting_cash_orders")
    .select("order_type, amount, status")
    .eq("company_id", companyId)
    .eq("status", "approved");

  if (startDate) {
    query = query.gte("order_date", startDate);
  }
  if (endDate) {
    query = query.lte("order_date", endDate);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { pkoCount: 0, pkoAmount: 0, rkoCount: 0, rkoAmount: 0, balance: 0 };
  }

  const pko = data.filter((d) => d.order_type === "pko");
  const rko = data.filter((d) => d.order_type === "rko");

  const pkoAmount = pko.reduce((sum, d) => sum + (d.amount || 0), 0);
  const rkoAmount = rko.reduce((sum, d) => sum + (d.amount || 0), 0);

  return {
    pkoCount: pko.length,
    pkoAmount,
    rkoCount: rko.length,
    rkoAmount,
    balance: pkoAmount - rkoAmount,
  };
}
