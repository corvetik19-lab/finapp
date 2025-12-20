"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  BankConnection,
  BankTransaction,
  BankProcessingRule,
  BankSyncLog,
  BankSyncSummary,
  CreateConnectionInput,
  CreateRuleInput,
} from "./types";

// ============================================
// Подключения
// ============================================

export async function getBankConnections(): Promise<BankConnection[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("company_id", companyId)
    .order("bank_name", { ascending: true });

  if (error) {
    logger.error("Error fetching bank connections:", error);
    return [];
  }

  return data || [];
}

export async function getBankConnection(id: string): Promise<BankConnection | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching bank connection:", error);
    return null;
  }

  return data;
}

export async function createBankConnection(
  input: CreateConnectionInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("bank_connections")
    .insert({
      company_id: companyId,
      bank_code: input.bank_code,
      bank_name: input.bank_name,
      credentials: input.credentials,
      settings: input.settings || {},
      auto_sync_enabled: input.auto_sync_enabled ?? true,
      sync_interval_minutes: input.sync_interval_minutes || 60,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating bank connection:", error);
    return { success: false, error: "Ошибка создания подключения" };
  }

  return { success: true, id: data.id };
}

export async function updateConnectionStatus(
  id: string,
  status: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("bank_connections")
    .update({
      status,
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating connection status:", error);
    return { success: false, error: "Ошибка обновления статуса" };
  }

  return { success: true };
}

export async function deleteBankConnection(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("bank_connections")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting bank connection:", error);
    return { success: false, error: "Ошибка удаления подключения" };
  }

  return { success: true };
}

// ============================================
// Транзакции
// ============================================

export async function getBankTransactions(filters?: {
  bankAccountId?: string;
  statementId?: string;
  processingStatus?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
}): Promise<BankTransaction[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: false });

  if (filters?.bankAccountId) {
    query = query.eq("bank_account_id", filters.bankAccountId);
  }
  if (filters?.statementId) {
    query = query.eq("statement_id", filters.statementId);
  }
  if (filters?.processingStatus) {
    query = query.eq("processing_status", filters.processingStatus);
  }
  if (filters?.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }
  if (filters?.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching bank transactions:", error);
    return [];
  }

  return data || [];
}

export async function updateTransactionStatus(
  id: string,
  status: string,
  linkedDocumentType?: string,
  linkedDocumentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {
    processing_status: status,
    processed_at: new Date().toISOString(),
  };

  if (linkedDocumentType) {
    updateData.linked_document_type = linkedDocumentType;
  }
  if (linkedDocumentId) {
    updateData.linked_document_id = linkedDocumentId;
  }

  const { error } = await supabase
    .from("bank_transactions")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating transaction status:", error);
    return { success: false, error: "Ошибка обновления статуса" };
  }

  return { success: true };
}

export async function matchTransactionCounterparty(
  id: string,
  counterpartyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      matched_counterparty_id: counterpartyId,
      processing_status: "matched",
      processed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error matching counterparty:", error);
    return { success: false, error: "Ошибка сопоставления контрагента" };
  }

  return { success: true };
}

// ============================================
// Правила обработки
// ============================================

export async function getProcessingRules(): Promise<BankProcessingRule[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("bank_processing_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("priority", { ascending: true });

  if (error) {
    logger.error("Error fetching processing rules:", error);
    return [];
  }

  return data || [];
}

export async function createProcessingRule(
  input: CreateRuleInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("bank_processing_rules")
    .insert({
      company_id: companyId,
      name: input.name,
      rule_type: input.rule_type,
      conditions: input.conditions,
      action_type: input.action_type,
      action_params: input.action_params,
      priority: input.priority || 100,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating processing rule:", error);
    return { success: false, error: "Ошибка создания правила" };
  }

  return { success: true, id: data.id };
}

export async function deleteProcessingRule(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("bank_processing_rules")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting processing rule:", error);
    return { success: false, error: "Ошибка удаления правила" };
  }

  return { success: true };
}

// ============================================
// Логи синхронизации
// ============================================

export async function getSyncLogs(connectionId?: string): Promise<BankSyncLog[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("bank_sync_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(100);

  if (connectionId) {
    query = query.eq("connection_id", connectionId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching sync logs:", error);
    return [];
  }

  return data || [];
}

export async function startSync(
  connectionId: string,
  syncType: "full" | "incremental" | "manual"
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Создаём запись лога
  const { data: log, error } = await supabase
    .from("bank_sync_logs")
    .insert({
      company_id: companyId,
      connection_id: connectionId,
      sync_type: syncType,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error starting sync:", error);
    return { success: false, error: "Ошибка запуска синхронизации" };
  }

  // Здесь в реальности был бы вызов API банка
  // Для демонстрации просто помечаем как успешную

  return { success: true, logId: log.id };
}

export async function finishSync(
  logId: string,
  status: "success" | "partial" | "error",
  stats?: {
    accountsSynced?: number;
    transactionsFetched?: number;
    transactionsNew?: number;
    transactionsUpdated?: number;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("bank_sync_logs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      accounts_synced: stats?.accountsSynced || 0,
      transactions_fetched: stats?.transactionsFetched || 0,
      transactions_new: stats?.transactionsNew || 0,
      transactions_updated: stats?.transactionsUpdated || 0,
      error_message: stats?.errorMessage,
    })
    .eq("id", logId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error finishing sync:", error);
    return { success: false, error: "Ошибка завершения синхронизации" };
  }

  return { success: true };
}

// ============================================
// Сводка
// ============================================

export async function getBankSyncSummary(): Promise<BankSyncSummary> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptySummary: BankSyncSummary = {
    totalConnections: 0,
    activeConnections: 0,
    pendingTransactions: 0,
    processedToday: 0,
  };

  if (!companyId) return emptySummary;

  // Подключения
  const { count: totalConnections } = await supabase
    .from("bank_connections")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: activeConnections } = await supabase
    .from("bank_connections")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  // Последняя синхронизация
  const { data: lastSync } = await supabase
    .from("bank_sync_logs")
    .select("finished_at")
    .eq("company_id", companyId)
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .single();

  // Ожидающие транзакции
  const { count: pendingTransactions } = await supabase
    .from("bank_transactions")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("processing_status", "new");

  // Обработано сегодня
  const today = new Date().toISOString().split("T")[0];
  const { count: processedToday } = await supabase
    .from("bank_transactions")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("processed_at", today)
    .neq("processing_status", "new");

  return {
    totalConnections: totalConnections || 0,
    activeConnections: activeConnections || 0,
    lastSyncDate: lastSync?.finished_at,
    pendingTransactions: pendingTransactions || 0,
    processedToday: processedToday || 0,
  };
}
