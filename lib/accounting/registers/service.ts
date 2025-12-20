"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  ChartOfAccounts,
  JournalEntry,
  OSVReport,
  OSVRow,
  CreateJournalEntryInput,
  PurchaseLedgerEntry,
  SalesLedgerEntry,
  CreatePurchaseLedgerInput,
  CreateSalesLedgerInput,
} from "./types";

// ============================================
// План счетов
// ============================================

export async function getChartOfAccounts(): Promise<ChartOfAccounts[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("accounting_chart_of_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("account_code", { ascending: true });

  if (error) {
    logger.error("Error fetching chart of accounts:", error);
    return [];
  }

  return data || [];
}

export async function getAccount(accountId: string): Promise<ChartOfAccounts | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("accounting_chart_of_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching account:", error);
    return null;
  }

  return data;
}

// ============================================
// Журнал проводок
// ============================================

export async function getJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  counterpartyId?: string;
}): Promise<JournalEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_journal_entries")
    .select(`
      *,
      debit_account:accounting_chart_of_accounts!debit_account_id(account_code, account_name),
      credit_account:accounting_chart_of_accounts!credit_account_id(account_code, account_name)
    `)
    .eq("company_id", companyId)
    .order("entry_date", { ascending: false })
    .order("entry_number", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("entry_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("entry_date", filters.endDate);
  }
  if (filters?.accountId) {
    query = query.or(`debit_account_id.eq.${filters.accountId},credit_account_id.eq.${filters.accountId}`);
  }
  if (filters?.counterpartyId) {
    query = query.eq("counterparty_id", filters.counterpartyId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching journal entries:", error);
    return [];
  }

  return data || [];
}

export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  // Получаем следующий номер проводки
  const { data: lastEntry } = await supabase
    .from("accounting_journal_entries")
    .select("entry_number")
    .eq("company_id", companyId)
    .eq("entry_date", input.entry_date)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const entryNumber = (lastEntry?.entry_number || 0) + 1;

  const { data, error } = await supabase
    .from("accounting_journal_entries")
    .insert({
      company_id: companyId,
      entry_date: input.entry_date,
      entry_number: entryNumber,
      debit_account_id: input.debit_account_id,
      debit_amount: input.amount,
      credit_account_id: input.credit_account_id,
      credit_amount: input.amount,
      description: input.description,
      document_type: input.document_type,
      document_id: input.document_id,
      counterparty_id: input.counterparty_id,
      tender_id: input.tender_id,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating journal entry:", error);
    return { success: false, error: "Ошибка создания проводки" };
  }

  return { success: true, id: data.id };
}

export async function reverseJournalEntry(
  entryId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем исходную проводку
  const { data: original } = await supabase
    .from("accounting_journal_entries")
    .select("*")
    .eq("id", entryId)
    .eq("company_id", companyId)
    .single();

  if (!original) {
    return { success: false, error: "Проводка не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();
  const today = new Date().toISOString().split("T")[0];

  // Создаём сторнирующую проводку (меняем дебет и кредит местами)
  const { data, error } = await supabase
    .from("accounting_journal_entries")
    .insert({
      company_id: companyId,
      entry_date: today,
      debit_account_id: original.credit_account_id,
      debit_amount: original.credit_amount,
      credit_account_id: original.debit_account_id,
      credit_amount: original.debit_amount,
      description: `СТОРНО: ${original.description || ""}`,
      document_type: original.document_type,
      document_id: original.document_id,
      counterparty_id: original.counterparty_id,
      tender_id: original.tender_id,
      is_reversed: true,
      reversed_entry_id: entryId,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error reversing journal entry:", error);
    return { success: false, error: "Ошибка сторнирования" };
  }

  return { success: true, id: data.id };
}

// ============================================
// ОСВ (Оборотно-сальдовая ведомость)
// ============================================

export async function getOSV(
  startDate: string,
  endDate: string
): Promise<OSVReport> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptyReport: OSVReport = {
    period_start: startDate,
    period_end: endDate,
    rows: [],
    totals: {
      opening_debit: 0,
      opening_credit: 0,
      turnover_debit: 0,
      turnover_credit: 0,
      closing_debit: 0,
      closing_credit: 0,
    },
  };

  if (!companyId) return emptyReport;

  // Вызываем хранимую функцию
  const { data, error } = await supabase.rpc("calculate_osv", {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    logger.error("Error calculating OSV:", error);
    return emptyReport;
  }

  const rows: OSVRow[] = data || [];

  // Считаем итоги
  const totals = rows.reduce(
    (acc, row) => ({
      opening_debit: acc.opening_debit + row.opening_debit,
      opening_credit: acc.opening_credit + row.opening_credit,
      turnover_debit: acc.turnover_debit + row.turnover_debit,
      turnover_credit: acc.turnover_credit + row.turnover_credit,
      closing_debit: acc.closing_debit + row.closing_debit,
      closing_credit: acc.closing_credit + row.closing_credit,
    }),
    emptyReport.totals
  );

  return {
    period_start: startDate,
    period_end: endDate,
    rows,
    totals,
  };
}

// ============================================
// Книга покупок
// ============================================

export async function getPurchaseLedger(
  year: number,
  quarter: number
): Promise<PurchaseLedgerEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("accounting_purchase_ledger")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_quarter", quarter)
    .order("entry_number", { ascending: true });

  if (error) {
    logger.error("Error fetching purchase ledger:", error);
    return [];
  }

  return data || [];
}

export async function createPurchaseLedgerEntry(
  input: CreatePurchaseLedgerInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем следующий номер
  const { data: lastEntry } = await supabase
    .from("accounting_purchase_ledger")
    .select("entry_number")
    .eq("company_id", companyId)
    .eq("period_year", input.period_year)
    .eq("period_quarter", input.period_quarter)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const entryNumber = (lastEntry?.entry_number || 0) + 1;

  const { data, error } = await supabase
    .from("accounting_purchase_ledger")
    .insert({
      company_id: companyId,
      period_year: input.period_year,
      period_quarter: input.period_quarter,
      entry_number: entryNumber,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      counterparty_inn: input.counterparty_inn,
      counterparty_kpp: input.counterparty_kpp,
      document_type: input.document_type,
      document_number: input.document_number,
      document_date: input.document_date,
      total_amount: input.total_amount,
      vat_amount: input.vat_amount,
      vat_rate: input.vat_rate || 20,
      payment_date: input.payment_date,
      payment_document: input.payment_document,
      operation_code: input.operation_code || "01",
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating purchase ledger entry:", error);
    return { success: false, error: "Ошибка добавления в книгу покупок" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Книга продаж
// ============================================

export async function getSalesLedger(
  year: number,
  quarter: number
): Promise<SalesLedgerEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("accounting_sales_ledger")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_quarter", quarter)
    .order("entry_number", { ascending: true });

  if (error) {
    logger.error("Error fetching sales ledger:", error);
    return [];
  }

  return data || [];
}

export async function createSalesLedgerEntry(
  input: CreateSalesLedgerInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем следующий номер
  const { data: lastEntry } = await supabase
    .from("accounting_sales_ledger")
    .select("entry_number")
    .eq("company_id", companyId)
    .eq("period_year", input.period_year)
    .eq("period_quarter", input.period_quarter)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const entryNumber = (lastEntry?.entry_number || 0) + 1;

  const { data, error } = await supabase
    .from("accounting_sales_ledger")
    .insert({
      company_id: companyId,
      period_year: input.period_year,
      period_quarter: input.period_quarter,
      entry_number: entryNumber,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      counterparty_inn: input.counterparty_inn,
      counterparty_kpp: input.counterparty_kpp,
      invoice_number: input.invoice_number,
      invoice_date: input.invoice_date,
      correction_number: input.correction_number,
      correction_date: input.correction_date,
      total_amount: input.total_amount,
      vat_amount: input.vat_amount,
      vat_rate: input.vat_rate || 20,
      operation_code: input.operation_code || "01",
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating sales ledger entry:", error);
    return { success: false, error: "Ошибка добавления в книгу продаж" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Сводка по НДС
// ============================================

export async function getVATSummary(
  year: number,
  quarter: number
): Promise<{
  purchaseVAT: number;
  salesVAT: number;
  vatToPay: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { purchaseVAT: 0, salesVAT: 0, vatToPay: 0 };
  }

  // НДС к вычету (книга покупок)
  const { data: purchases } = await supabase
    .from("accounting_purchase_ledger")
    .select("vat_amount")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_quarter", quarter)
    .eq("is_included", true);

  const purchaseVAT = (purchases || []).reduce((sum, p) => sum + (p.vat_amount || 0), 0);

  // НДС к уплате (книга продаж)
  const { data: sales } = await supabase
    .from("accounting_sales_ledger")
    .select("vat_amount")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_quarter", quarter)
    .eq("is_included", true);

  const salesVAT = (sales || []).reduce((sum, s) => sum + (s.vat_amount || 0), 0);

  return {
    purchaseVAT,
    salesVAT,
    vatToPay: salesVAT - purchaseVAT,
  };
}
