"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { ensureValidToken } from "./bank-oauth";
import { OperationType } from "./bank-types";
import { logger } from "@/lib/logger";

const TINKOFF_API_BASE = "https://business.tinkoff.ru/openapi/api/v1";
const TINKOFF_SANDBOX_BASE = "https://business.tinkoff.ru/openapi/sandbox/api/v1";

interface TinkoffAccount {
  accountNumber: string;
  name: string;
  currency: string;
  balance: {
    otb: number;
    authorized: number;
    pendingPayments: number;
    pendingRequisitions: number;
  };
  status: string;
}

interface TinkoffOperation {
  id: string;
  date: string;
  amount: number;
  currency: string;
  operationType: "Credit" | "Debit";
  category: string;
  status: string;
  counterparty?: {
    name: string;
    inn?: string;
    kpp?: string;
    accountNumber?: string;
    bankName?: string;
    bankBik?: string;
  };
  paymentPurpose?: string;
  fee?: number;
  balanceAfter?: number;
}

// Получение списка счетов из Тинькофф
export async function fetchTinkoffAccounts(
  integrationId: string
): Promise<{ success: boolean; accounts?: TinkoffAccount[]; error?: string }> {
  const tokenResult = await ensureValidToken(integrationId);
  
  if (!tokenResult.valid || !tokenResult.token) {
    return { success: false, error: tokenResult.error || "Invalid token" };
  }

  const supabase = await createRSCClient();
  const { data: integration } = await supabase
    .from("bank_integrations")
    .select("is_sandbox")
    .eq("id", integrationId)
    .single();

  const baseUrl = integration?.is_sandbox ? TINKOFF_SANDBOX_BASE : TINKOFF_API_BASE;

  try {
    const response = await fetch(`${baseUrl}/bank-accounts`, {
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Tinkoff API error:", errorText);
      return { success: false, error: "Failed to fetch accounts" };
    }

    const data = await response.json();
    return { success: true, accounts: data };
  } catch (error) {
    logger.error("Tinkoff API network error:", error);
    return { success: false, error: "Network error" };
  }
}

// Получение выписки из Тинькофф
export async function fetchTinkoffStatements(
  integrationId: string,
  accountNumber: string,
  dateFrom: string,
  dateTo: string
): Promise<{ success: boolean; operations?: TinkoffOperation[]; error?: string }> {
  const tokenResult = await ensureValidToken(integrationId);
  
  if (!tokenResult.valid || !tokenResult.token) {
    return { success: false, error: tokenResult.error || "Invalid token" };
  }

  const supabase = await createRSCClient();
  const { data: integration } = await supabase
    .from("bank_integrations")
    .select("is_sandbox")
    .eq("id", integrationId)
    .single();

  const baseUrl = integration?.is_sandbox ? TINKOFF_SANDBOX_BASE : TINKOFF_API_BASE;

  try {
    const params = new URLSearchParams({
      accountNumber,
      from: dateFrom,
      to: dateTo,
    });

    const response = await fetch(`${baseUrl}/bank-statement?${params}`, {
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Tinkoff API error:", errorText);
      return { success: false, error: "Failed to fetch statements" };
    }

    const data = await response.json();
    return { success: true, operations: data.operations || [] };
  } catch (error) {
    logger.error("Tinkoff API network error:", error);
    return { success: false, error: "Network error" };
  }
}

// Синхронизация транзакций с базой данных
export async function syncTinkoffTransactions(
  integrationId: string,
  bankAccountId: string,
  dateFrom: string,
  dateTo: string
): Promise<{ success: boolean; created: number; updated: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, created: 0, updated: 0, error: "Company not found" };
  }

  // Получаем счёт для номера счёта
  const { data: account } = await supabase
    .from("bank_accounts")
    .select("account_number")
    .eq("id", bankAccountId)
    .single();

  if (!account) {
    return { success: false, created: 0, updated: 0, error: "Account not found" };
  }

  // Логируем начало синхронизации
  const { data: syncLog } = await supabase
    .from("bank_sync_logs")
    .insert({
      company_id: companyId,
      integration_id: integrationId,
      operation_type: "sync_transactions",
      status: "started",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Получаем транзакции из Тинькофф
  const result = await fetchTinkoffStatements(
    integrationId,
    account.account_number,
    dateFrom,
    dateTo
  );

  if (!result.success || !result.operations) {
    // Обновляем лог с ошибкой
    if (syncLog) {
      await supabase
        .from("bank_sync_logs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: result.error,
        })
        .eq("id", syncLog.id);
    }

    return { success: false, created: 0, updated: 0, error: result.error };
  }

  let created = 0;
  let updated = 0;

  // Обрабатываем каждую транзакцию
  for (const op of result.operations) {
    const operationType: OperationType = op.operationType === "Credit" ? "credit" : "debit";
    
    // Проверяем, есть ли уже такая транзакция
    const { data: existing } = await supabase
      .from("bank_transactions")
      .select("id")
      .eq("company_id", companyId)
      .eq("external_id", op.id)
      .single();

    const transactionData = {
      company_id: companyId,
      bank_account_id: bankAccountId,
      integration_id: integrationId,
      external_id: op.id,
      transaction_date: op.date.split("T")[0],
      transaction_time: op.date.split("T")[1]?.substring(0, 8) || null,
      operation_type: operationType,
      amount: Math.abs(op.amount),
      fee: op.fee || 0,
      balance_after: op.balanceAfter || null,
      counterparty_name: op.counterparty?.name || null,
      counterparty_inn: op.counterparty?.inn || null,
      counterparty_kpp: op.counterparty?.kpp || null,
      counterparty_account: op.counterparty?.accountNumber || null,
      counterparty_bank_name: op.counterparty?.bankName || null,
      counterparty_bank_bik: op.counterparty?.bankBik || null,
      purpose: op.paymentPurpose || null,
      category: op.category || null,
      processing_status: "new",
      raw_data: op,
    };

    if (existing) {
      // Обновляем существующую транзакцию
      await supabase
        .from("bank_transactions")
        .update(transactionData)
        .eq("id", existing.id);
      updated++;
    } else {
      // Создаём новую транзакцию
      await supabase
        .from("bank_transactions")
        .insert(transactionData);
      created++;
    }
  }

  // Обновляем баланс счёта (берём последнюю транзакцию)
  if (result.operations.length > 0) {
    const lastOp = result.operations[result.operations.length - 1];
    if (lastOp.balanceAfter !== undefined) {
      await supabase
        .from("bank_accounts")
        .update({
          balance: lastOp.balanceAfter,
          balance_updated_at: new Date().toISOString(),
        })
        .eq("id", bankAccountId);
    }
  }

  // Обновляем интеграцию
  await supabase
    .from("bank_integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", integrationId);

  // Завершаем лог синхронизации
  if (syncLog) {
    await supabase
      .from("bank_sync_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_processed: result.operations.length,
        records_created: created,
        records_updated: updated,
      })
      .eq("id", syncLog.id);
  }

  return { success: true, created, updated };
}

// Обновление балансов всех счетов интеграции
export async function syncTinkoffBalances(
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Company not found" };
  }

  // Получаем счета из Тинькофф
  const result = await fetchTinkoffAccounts(integrationId);
  
  if (!result.success || !result.accounts) {
    return { success: false, error: result.error };
  }

  // Обновляем балансы в БД
  for (const tinkoffAccount of result.accounts) {
    await supabase
      .from("bank_accounts")
      .update({
        balance: tinkoffAccount.balance.otb,
        balance_updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("account_number", tinkoffAccount.accountNumber);
  }

  return { success: true };
}
