"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  BankAccount,
  BankIntegration,
  BankTransaction,
  PaymentOrder,
  BankSyncLog,
  CreateBankAccountDTO,
  UpdateBankAccountDTO,
  CreateBankIntegrationDTO,
  UpdateBankIntegrationDTO,
  CreatePaymentOrderDTO,
} from "./bank-types";
import { logger } from "@/lib/logger";

// ============================================
// Расчётные счета
// ============================================

export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });
  
  if (error) {
    logger.error("Error fetching bank accounts:", error);
    return [];
  }
  
  return data || [];
}

export async function getBankAccount(id: string): Promise<BankAccount | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  if (error) {
    logger.error("Error fetching bank account:", error);
    return null;
  }
  
  return data;
}

export async function createBankAccount(dto: CreateBankAccountDTO): Promise<BankAccount | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  // Если это основной счёт, сбросить флаг у других
  if (dto.is_primary) {
    await supabase
      .from("bank_accounts")
      .update({ is_primary: false })
      .eq("company_id", companyId);
  }
  
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      ...dto,
      company_id: companyId,
      currency: dto.currency || "RUB",
      account_type: dto.account_type || "checking",
    })
    .select()
    .single();
  
  if (error) {
    logger.error("Error creating bank account:", error);
    return null;
  }
  
  return data;
}

export async function updateBankAccount(
  id: string,
  dto: UpdateBankAccountDTO
): Promise<BankAccount | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  // Если устанавливаем основной, сбросить у других
  if (dto.is_primary) {
    await supabase
      .from("bank_accounts")
      .update({ is_primary: false })
      .eq("company_id", companyId)
      .neq("id", id);
  }
  
  const { data, error } = await supabase
    .from("bank_accounts")
    .update(dto)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  
  if (error) {
    logger.error("Error updating bank account:", error);
    return null;
  }
  
  return data;
}

export async function deleteBankAccount(id: string): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return false;
  
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    logger.error("Error deleting bank account:", error);
    return false;
  }
  
  return true;
}

// ============================================
// Банковские интеграции
// ============================================

export async function getBankIntegrations(): Promise<BankIntegration[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  
  if (error) {
    logger.error("Error fetching bank integrations:", error);
    return [];
  }
  
  return data || [];
}

export async function getBankIntegration(id: string): Promise<BankIntegration | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  if (error) {
    logger.error("Error fetching bank integration:", error);
    return null;
  }
  
  return data;
}

export async function createBankIntegration(
  dto: CreateBankIntegrationDTO
): Promise<BankIntegration | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("bank_integrations")
    .insert({
      ...dto,
      company_id: companyId,
      integration_type: dto.integration_type || "api",
      is_sandbox: dto.is_sandbox ?? true,
      status: "pending",
    })
    .select()
    .single();
  
  if (error) {
    logger.error("Error creating bank integration:", error);
    return null;
  }
  
  return data;
}

export async function updateBankIntegration(
  id: string,
  dto: UpdateBankIntegrationDTO
): Promise<BankIntegration | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("bank_integrations")
    .update(dto)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  
  if (error) {
    logger.error("Error updating bank integration:", error);
    return null;
  }
  
  return data;
}

export async function deleteBankIntegration(id: string): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return false;
  
  const { error } = await supabase
    .from("bank_integrations")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    logger.error("Error deleting bank integration:", error);
    return false;
  }
  
  return true;
}

// ============================================
// Банковские транзакции
// ============================================

export async function getBankTransactions(filters?: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  operationType?: "credit" | "debit";
  status?: string;
  limit?: number;
}): Promise<BankTransaction[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("company_id", companyId);
  
  if (filters?.accountId) {
    query = query.eq("bank_account_id", filters.accountId);
  }
  
  if (filters?.dateFrom) {
    query = query.gte("transaction_date", filters.dateFrom);
  }
  
  if (filters?.dateTo) {
    query = query.lte("transaction_date", filters.dateTo);
  }
  
  if (filters?.operationType) {
    query = query.eq("operation_type", filters.operationType);
  }
  
  if (filters?.status) {
    query = query.eq("processing_status", filters.status);
  }
  
  query = query.order("transaction_date", { ascending: false });
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error("Error fetching bank transactions:", error);
    return [];
  }
  
  return data || [];
}

export async function updateBankTransaction(
  id: string,
  updates: Partial<BankTransaction>
): Promise<BankTransaction | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("bank_transactions")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  
  if (error) {
    logger.error("Error updating bank transaction:", error);
    return null;
  }
  
  return data;
}

// ============================================
// Платёжные поручения
// ============================================

export async function getPaymentOrders(filters?: {
  accountId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaymentOrder[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("payment_orders")
    .select("*")
    .eq("company_id", companyId);
  
  if (filters?.accountId) {
    query = query.eq("bank_account_id", filters.accountId);
  }
  
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  
  if (filters?.dateFrom) {
    query = query.gte("order_date", filters.dateFrom);
  }
  
  if (filters?.dateTo) {
    query = query.lte("order_date", filters.dateTo);
  }
  
  query = query.order("order_date", { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    logger.error("Error fetching payment orders:", error);
    return [];
  }
  
  return data || [];
}

export async function getPaymentOrder(id: string): Promise<PaymentOrder | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  if (error) {
    logger.error("Error fetching payment order:", error);
    return null;
  }
  
  return data;
}

export async function createPaymentOrder(
  dto: CreatePaymentOrderDTO
): Promise<PaymentOrder | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!companyId || !user) return null;
  
  const { data, error } = await supabase
    .from("payment_orders")
    .insert({
      ...dto,
      company_id: companyId,
      created_by: user.id,
      status: "draft",
    })
    .select()
    .single();
  
  if (error) {
    logger.error("Error creating payment order:", error);
    return null;
  }
  
  return data;
}

export async function updatePaymentOrder(
  id: string,
  updates: Partial<PaymentOrder>
): Promise<PaymentOrder | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("payment_orders")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  
  if (error) {
    logger.error("Error updating payment order:", error);
    return null;
  }
  
  return data;
}

export async function deletePaymentOrder(id: string): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return false;
  
  // Можно удалять только черновики
  const { error } = await supabase
    .from("payment_orders")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");
  
  if (error) {
    logger.error("Error deleting payment order:", error);
    return false;
  }
  
  return true;
}

// ============================================
// Логи синхронизации
// ============================================

export async function getBankSyncLogs(integrationId: string): Promise<BankSyncLog[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from("bank_sync_logs")
    .select("*")
    .eq("company_id", companyId)
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false })
    .limit(50);
  
  if (error) {
    logger.error("Error fetching bank sync logs:", error);
    return [];
  }
  
  return data || [];
}

// ============================================
// Статистика по счетам
// ============================================

export async function getBankAccountsStats(): Promise<{
  totalBalance: number;
  accountsCount: number;
  activeCount: number;
  integrationsCount: number;
  lastSyncAt: string | null;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return {
      totalBalance: 0,
      accountsCount: 0,
      activeCount: 0,
      integrationsCount: 0,
      lastSyncAt: null,
    };
  }
  
  // Получаем счета
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("balance, status")
    .eq("company_id", companyId);
  
  // Получаем интеграции
  const { data: integrations } = await supabase
    .from("bank_integrations")
    .select("status, last_sync_at")
    .eq("company_id", companyId);
  
  const totalBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const activeCount = (accounts || []).filter(acc => acc.status === "active").length;
  const activeIntegrations = (integrations || []).filter(i => i.status === "active");
  
  // Находим последнюю синхронизацию
  let lastSyncAt: string | null = null;
  for (const integration of activeIntegrations) {
    if (integration.last_sync_at) {
      if (!lastSyncAt || new Date(integration.last_sync_at) > new Date(lastSyncAt)) {
        lastSyncAt = integration.last_sync_at;
      }
    }
  }
  
  return {
    totalBalance,
    accountsCount: (accounts || []).length,
    activeCount,
    integrationsCount: activeIntegrations.length,
    lastSyncAt,
  };
}
