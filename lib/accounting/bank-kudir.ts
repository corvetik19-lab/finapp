"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// Создание записи КУДиР из банковской транзакции
export async function createKudirEntryFromTransaction(
  transactionId: string
): Promise<{ success: boolean; kudirEntryId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем транзакцию
  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction) {
    return { success: false, error: "Транзакция не найдена" };
  }

  // Проверяем, есть ли уже запись КУДиР для этой транзакции
  const { data: existing } = await supabase
    .from("kudir_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("bank_transaction_id", transactionId)
    .single();

  if (existing) {
    return { success: false, error: "Запись КУДиР уже существует для этой транзакции" };
  }

  // Определяем тип записи
  const entryType = transaction.operation_type === "credit" ? "income" : "expense";

  // Формируем описание
  let description = transaction.purpose || "";
  if (transaction.counterparty_name) {
    description = `${transaction.counterparty_name}: ${description}`;
  }

  // Получаем номер следующей записи
  const { data: lastEntry } = await supabase
    .from("kudir_entries")
    .select("entry_number")
    .eq("company_id", companyId)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const entryNumber = (lastEntry?.entry_number || 0) + 1;

  // Создаём запись КУДиР
  const { data: kudirEntry, error } = await supabase
    .from("kudir_entries")
    .insert({
      company_id: companyId,
      entry_number: entryNumber,
      entry_date: transaction.transaction_date,
      entry_type: entryType,
      amount: transaction.amount,
      description: description.substring(0, 500),
      document_number: transaction.external_id,
      document_date: transaction.transaction_date,
      counterparty_name: transaction.counterparty_name,
      counterparty_inn: transaction.counterparty_inn,
      bank_transaction_id: transactionId,
      accounting_document_id: transaction.accounting_document_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating KUDIR entry:", error);
    return { success: false, error: "Ошибка создания записи КУДиР" };
  }

  // Обновляем статус транзакции
  await supabase
    .from("bank_transactions")
    .update({
      processing_status: "processed",
      kudir_entry_id: kudirEntry.id,
    })
    .eq("id", transactionId);

  return { success: true, kudirEntryId: kudirEntry.id };
}

// Массовое создание записей КУДиР из транзакций
export async function createKudirEntriesFromTransactions(
  transactionIds: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const txId of transactionIds) {
    const result = await createKudirEntryFromTransaction(txId);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`${txId}: ${result.error}`);
    }
  }

  return results;
}

// Автоматическое создание записей КУДиР для обработанных транзакций
export async function autoCreateKudirEntries(
  bankAccountId?: string
): Promise<{ processed: number; created: number }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { processed: 0, created: 0 };
  }

  // Получаем обработанные транзакции без записей КУДиР
  let query = supabase
    .from("bank_transactions")
    .select("id")
    .eq("company_id", companyId)
    .eq("processing_status", "processed")
    .is("kudir_entry_id", null)
    .limit(100);

  if (bankAccountId) {
    query = query.eq("bank_account_id", bankAccountId);
  }

  const { data: transactions } = await query;

  if (!transactions || transactions.length === 0) {
    return { processed: 0, created: 0 };
  }

  let created = 0;

  for (const tx of transactions) {
    const result = await createKudirEntryFromTransaction(tx.id);
    if (result.success) {
      created++;
    }
  }

  return { processed: transactions.length, created };
}

// Получить запись КУДиР для транзакции
export async function getKudirEntryForTransaction(
  transactionId: string
): Promise<{
  id: string;
  entryNumber: number;
  entryDate: string;
  entryType: "income" | "expense";
  amount: number;
  description: string;
} | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("kudir_entry_id")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction?.kudir_entry_id) return null;

  const { data: entry } = await supabase
    .from("kudir_entries")
    .select("id, entry_number, entry_date, entry_type, amount, description")
    .eq("id", transaction.kudir_entry_id)
    .single();

  if (!entry) return null;

  return {
    id: entry.id,
    entryNumber: entry.entry_number,
    entryDate: entry.entry_date,
    entryType: entry.entry_type,
    amount: entry.amount,
    description: entry.description,
  };
}

// Удалить запись КУДиР и отвязать от транзакции
export async function deleteKudirEntryForTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем транзакцию
  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("kudir_entry_id")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction?.kudir_entry_id) {
    return { success: false, error: "Запись КУДиР не найдена" };
  }

  // Удаляем запись КУДиР
  const { error: deleteError } = await supabase
    .from("kudir_entries")
    .delete()
    .eq("id", transaction.kudir_entry_id)
    .eq("company_id", companyId);

  if (deleteError) {
    return { success: false, error: "Ошибка удаления записи КУДиР" };
  }

  // Обновляем транзакцию
  await supabase
    .from("bank_transactions")
    .update({
      kudir_entry_id: null,
      processing_status: "pending",
    })
    .eq("id", transactionId);

  return { success: true };
}

// Получить статистику КУДиР за период
export async function getKudirStats(
  dateFrom: string,
  dateTo: string
): Promise<{
  totalIncome: number;
  totalExpense: number;
  entriesCount: number;
  incomeCount: number;
  expenseCount: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { totalIncome: 0, totalExpense: 0, entriesCount: 0, incomeCount: 0, expenseCount: 0 };
  }

  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("entry_type, amount")
    .eq("company_id", companyId)
    .gte("entry_date", dateFrom)
    .lte("entry_date", dateTo);

  if (!entries) {
    return { totalIncome: 0, totalExpense: 0, entriesCount: 0, incomeCount: 0, expenseCount: 0 };
  }

  const stats = entries.reduce(
    (acc, entry) => {
      if (entry.entry_type === "income") {
        acc.totalIncome += entry.amount;
        acc.incomeCount++;
      } else {
        acc.totalExpense += entry.amount;
        acc.expenseCount++;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 }
  );

  return {
    ...stats,
    entriesCount: entries.length,
  };
}
