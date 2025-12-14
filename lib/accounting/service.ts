"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  AccountingSettings,
  AccountingCounterparty,
  AccountingDocument,
  KudirEntry,
  TaxPayment,
  TaxCalendarEvent,
  CreateAccountingSettingsInput,
  UpdateAccountingSettingsInput,
  CreateCounterpartyInput,
  CreateDocumentInput,
  CreateKudirEntryInput,
  DocumentType,
  formatDocumentNumber,
  calculateVat,
} from "./types";

// ============================================
// Настройки бухгалтерии
// ============================================

export async function getAccountingSettings(): Promise<AccountingSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();
  
  if (error && error.code !== "PGRST116") {
    console.error("Error fetching accounting settings:", error);
    return null;
  }
  
  return data as AccountingSettings | null;
}

export async function createAccountingSettings(
  input: CreateAccountingSettingsInput
): Promise<AccountingSettings | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("accounting_settings")
    .insert(input)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating accounting settings:", error);
    return null;
  }
  
  return data as AccountingSettings;
}

export async function updateAccountingSettings(
  input: UpdateAccountingSettingsInput
): Promise<AccountingSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data, error } = await supabase
    .from("accounting_settings")
    .update(input)
    .eq("company_id", companyId)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating accounting settings:", error);
    return null;
  }
  
  return data as AccountingSettings;
}

// ============================================
// Контрагенты
// ============================================

export async function getCounterparties(): Promise<AccountingCounterparty[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("name");
  
  if (error) {
    console.error("Error fetching counterparties:", error);
    return [];
  }
  
  return data as AccountingCounterparty[];
}

export async function getCounterpartyById(id: string): Promise<AccountingCounterparty | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) {
    console.error("Error fetching counterparty:", error);
    return null;
  }
  
  return data as AccountingCounterparty;
}

export async function createCounterparty(
  input: CreateCounterpartyInput
): Promise<AccountingCounterparty | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("accounting_counterparties")
    .insert(input)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating counterparty:", error);
    return null;
  }
  
  return data as AccountingCounterparty;
}

export async function updateCounterparty(
  id: string,
  input: Partial<CreateCounterpartyInput>
): Promise<AccountingCounterparty | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("accounting_counterparties")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating counterparty:", error);
    return null;
  }
  
  return data as AccountingCounterparty;
}

export async function deleteCounterparty(id: string): Promise<boolean> {
  const supabase = await createRSCClient();
  
  const { error } = await supabase
    .from("accounting_counterparties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting counterparty:", error);
    return false;
  }
  
  return true;
}

// ============================================
// Документы
// ============================================

export async function getRecentDocuments(limit: number = 5): Promise<AccountingDocument[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from("accounting_documents")
    .select(`
      *,
      counterparty:accounting_counterparties(id, short_name, name)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error("Error fetching recent documents:", error);
    return [];
  }
  
  return data as AccountingDocument[];
}

export async function getDocuments(filters?: {
  document_type?: DocumentType;
  status?: string;
  counterparty_id?: string;
  tender_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<AccountingDocument[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("accounting_documents")
    .select(`
      *,
      counterparty:accounting_counterparties(id, name, inn),
      tender:tenders(id, purchase_number, subject)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null);
  
  if (filters?.document_type) {
    query = query.eq("document_type", filters.document_type);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.counterparty_id) {
    query = query.eq("counterparty_id", filters.counterparty_id);
  }
  if (filters?.tender_id) {
    query = query.eq("tender_id", filters.tender_id);
  }
  if (filters?.date_from) {
    query = query.gte("document_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("document_date", filters.date_to);
  }
  
  const { data, error } = await query.order("document_date", { ascending: false });
  
  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
  
  return data as AccountingDocument[];
}

export async function getDocumentById(id: string): Promise<AccountingDocument | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("accounting_documents")
    .select(`
      *,
      items:accounting_document_items(*),
      counterparty:accounting_counterparties(*),
      tender:tenders(id, purchase_number, subject)
    `)
    .eq("id", id)
    .single();
  
  if (error) {
    console.error("Error fetching document:", error);
    return null;
  }
  
  return data as AccountingDocument;
}

export async function createDocument(
  input: CreateDocumentInput
): Promise<AccountingDocument | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Получаем настройки для нумерации
  const settings = await getAccountingSettings();
  if (!settings) return null;
  
  // Определяем префикс и номер
  let prefix = "";
  let nextNumber = 1;
  let updateField = "";
  
  switch (input.document_type) {
    case "invoice":
      prefix = settings.invoice_prefix;
      nextNumber = settings.invoice_next_number;
      updateField = "invoice_next_number";
      break;
    case "act":
      prefix = settings.act_prefix;
      nextNumber = settings.act_next_number;
      updateField = "act_next_number";
      break;
    case "waybill":
      prefix = settings.waybill_prefix;
      nextNumber = settings.waybill_next_number;
      updateField = "waybill_next_number";
      break;
    case "upd":
      prefix = settings.upd_prefix;
      nextNumber = settings.upd_next_number;
      updateField = "upd_next_number";
      break;
    case "contract":
      prefix = settings.contract_prefix;
      nextNumber = settings.contract_next_number;
      updateField = "contract_next_number";
      break;
    default:
      prefix = "DOC";
      nextNumber = 1;
  }
  
  const documentNumber = formatDocumentNumber(prefix, nextNumber);
  
  // Рассчитываем суммы
  let subtotal = 0;
  let vatAmount = 0;
  
  const itemsWithTotals = input.items.map((item, index) => {
    const itemVatRate = item.vat_rate ?? input.vat_rate ?? 0;
    const itemTotal = Math.round(item.price_per_unit * item.quantity);
    const itemVatAmount = calculateVat(itemTotal, itemVatRate as 0 | 10 | 20);
    
    subtotal += itemTotal;
    vatAmount += itemVatAmount;
    
    return {
      position: index + 1,
      name: item.name,
      description: item.description || null,
      unit: item.unit || "шт",
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      vat_rate: itemVatRate,
      vat_amount: itemVatAmount,
      total: itemTotal + itemVatAmount,
    };
  });
  
  const total = subtotal + vatAmount;
  
  // Создаём документ
  const { data: document, error: docError } = await supabase
    .from("accounting_documents")
    .insert({
      company_id: input.company_id,
      created_by: user.id,
      document_type: input.document_type,
      document_number: documentNumber,
      document_date: input.document_date,
      tender_id: input.tender_id || null,
      counterparty_id: input.counterparty_id || null,
      counterparty_name: input.counterparty_name,
      counterparty_inn: input.counterparty_inn || null,
      counterparty_kpp: input.counterparty_kpp || null,
      counterparty_address: input.counterparty_address || null,
      subtotal,
      vat_amount: vatAmount,
      total,
      vat_rate: input.vat_rate || null,
      notes: input.notes || null,
    })
    .select()
    .single();
  
  if (docError) {
    console.error("Error creating document:", docError);
    return null;
  }
  
  // Создаём позиции
  const itemsToInsert = itemsWithTotals.map(item => ({
    document_id: document.id,
    ...item,
  }));
  
  const { error: itemsError } = await supabase
    .from("accounting_document_items")
    .insert(itemsToInsert);
  
  if (itemsError) {
    console.error("Error creating document items:", itemsError);
  }
  
  // Обновляем счётчик нумерации
  if (updateField) {
    await supabase
      .from("accounting_settings")
      .update({ [updateField]: nextNumber + 1 })
      .eq("company_id", input.company_id);
  }
  
  return document as AccountingDocument;
}

export async function updateDocumentStatus(
  id: string,
  status: string,
  paidAmount?: number
): Promise<boolean> {
  const supabase = await createRSCClient();
  
  const updateData: Record<string, unknown> = { status };
  
  if (status === "paid") {
    updateData.paid_at = new Date().toISOString();
    if (paidAmount !== undefined) {
      updateData.paid_amount = paidAmount;
    }
  }
  
  const { error } = await supabase
    .from("accounting_documents")
    .update(updateData)
    .eq("id", id);
  
  if (error) {
    console.error("Error updating document status:", error);
    return false;
  }
  
  return true;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const supabase = await createRSCClient();
  
  const { error } = await supabase
    .from("accounting_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting document:", error);
    return false;
  }
  
  return true;
}

// ============================================
// КУДиР
// ============================================

export async function getKudirEntries(filters?: {
  year?: number;
  quarter?: number;
  month?: number;
}): Promise<KudirEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("kudir_entries")
    .select(`
      *,
      document:accounting_documents(id, document_type, document_number),
      tender:tenders(id, purchase_number, subject)
    `)
    .eq("company_id", companyId);
  
  if (filters?.year) {
    const startDate = new Date(filters.year, 0, 1).toISOString().split("T")[0];
    const endDate = new Date(filters.year, 11, 31).toISOString().split("T")[0];
    query = query.gte("entry_date", startDate).lte("entry_date", endDate);
  }
  
  if (filters?.quarter && filters?.year) {
    const startMonth = (filters.quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const startDate = new Date(filters.year, startMonth, 1).toISOString().split("T")[0];
    const endDate = new Date(filters.year, endMonth + 1, 0).toISOString().split("T")[0];
    query = query.gte("entry_date", startDate).lte("entry_date", endDate);
  }
  
  const { data, error } = await query.order("entry_date").order("entry_number");
  
  if (error) {
    console.error("Error fetching kudir entries:", error);
    return [];
  }
  
  return data as KudirEntry[];
}

export async function createKudirEntry(
  input: CreateKudirEntryInput
): Promise<KudirEntry | null> {
  const supabase = await createRSCClient();
  
  // Получаем следующий номер записи
  const { data: lastEntry } = await supabase
    .from("kudir_entries")
    .select("entry_number")
    .eq("company_id", input.company_id)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();
  
  const nextNumber = (lastEntry?.entry_number || 0) + 1;
  
  const { data, error } = await supabase
    .from("kudir_entries")
    .insert({
      ...input,
      entry_number: nextNumber,
      income: input.income || 0,
      expense: input.expense || 0,
      deductible_expense: input.deductible_expense || 0,
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating kudir entry:", error);
    return null;
  }
  
  return data as KudirEntry;
}

// ============================================
// Налоговые платежи
// ============================================

export async function getTaxPayments(filters?: {
  year?: number;
  status?: string;
}): Promise<TaxPayment[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId);
  
  if (filters?.year) {
    query = query.eq("period_year", filters.year);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  
  const { data, error } = await query.order("due_date");
  
  if (error) {
    console.error("Error fetching tax payments:", error);
    return [];
  }
  
  return data as TaxPayment[];
}

export async function getUpcomingTaxPayments(days: number = 30): Promise<TaxPayment[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  const { data, error } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["pending", "partial"])
    .gte("due_date", today)
    .lte("due_date", futureDate)
    .order("due_date");
  
  if (error) {
    console.error("Error fetching upcoming tax payments:", error);
    return [];
  }
  
  return data as TaxPayment[];
}

export async function createTaxPayment(input: {
  company_id: string;
  tax_type: string;
  tax_name: string;
  period_year: number;
  period_quarter?: number;
  period_month?: number;
  calculated_amount: number;
  due_date: string;
  calculation_details?: Record<string, unknown>;
}): Promise<TaxPayment | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("tax_payments")
    .insert(input)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating tax payment:", error);
    return null;
  }
  
  return data as TaxPayment;
}

export async function updateTaxPaymentStatus(
  id: string,
  status: string,
  paidAmount?: number
): Promise<boolean> {
  const supabase = await createRSCClient();
  
  const updateData: Record<string, unknown> = { status };
  
  if (paidAmount !== undefined) {
    updateData.paid_amount = paidAmount;
  }
  if (status === "paid") {
    updateData.paid_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from("tax_payments")
    .update(updateData)
    .eq("id", id);
  
  if (error) {
    console.error("Error updating tax payment:", error);
    return false;
  }
  
  return true;
}

// ============================================
// Налоговый календарь
// ============================================

export async function getTaxCalendarEvents(filters?: {
  year?: number;
  month?: number;
}): Promise<TaxCalendarEvent[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  let query = supabase
    .from("tax_calendar_events")
    .select(`
      *,
      tax_payment:tax_payments(*)
    `)
    .eq("company_id", companyId);
  
  if (filters?.year && filters?.month) {
    const startDate = new Date(filters.year, filters.month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split("T")[0];
    query = query.gte("event_date", startDate).lte("event_date", endDate);
  } else if (filters?.year) {
    const startDate = new Date(filters.year, 0, 1).toISOString().split("T")[0];
    const endDate = new Date(filters.year, 11, 31).toISOString().split("T")[0];
    query = query.gte("event_date", startDate).lte("event_date", endDate);
  }
  
  const { data, error } = await query.order("event_date");
  
  if (error) {
    console.error("Error fetching tax calendar events:", error);
    return [];
  }
  
  return data as TaxCalendarEvent[];
}

// ============================================
// Расширенная статистика для дашборда
// ============================================

export interface MonthlyStats {
  month: number;
  income: number;
  expense: number;
}

export interface DebtorCreditor {
  counterparty_id: string;
  counterparty_name: string;
  amount: number;
  documents_count: number;
}

export interface TopCounterparty {
  id: string;
  name: string;
  income: number;
  expense: number;
  total: number;
}

export async function getExtendedDashboardStats(year?: number): Promise<{
  monthlyStats: MonthlyStats[];
  debtors: DebtorCreditor[];
  creditors: DebtorCreditor[];
  topCounterparties: TopCounterparty[];
  totalDebt: number;
  totalCredit: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  const currentYear = year || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  
  if (!companyId) {
    return {
      monthlyStats: [],
      debtors: [],
      creditors: [],
      topCounterparties: [],
      totalDebt: 0,
      totalCredit: 0,
    };
  }
  
  // Данные по месяцам из КУДиР
  const { data: kudirData } = await supabase
    .from("kudir_entries")
    .select("entry_date, income, expense")
    .eq("company_id", companyId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate);
  
  const monthlyMap = new Map<number, { income: number; expense: number }>();
  for (let i = 1; i <= 12; i++) {
    monthlyMap.set(i, { income: 0, expense: 0 });
  }
  
  kudirData?.forEach(entry => {
    const month = new Date(entry.entry_date).getMonth() + 1;
    const current = monthlyMap.get(month)!;
    current.income += entry.income || 0;
    current.expense += entry.expense || 0;
  });
  
  const monthlyStats: MonthlyStats[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
  }));
  
  // Дебиторская задолженность (неоплаченные исходящие счета/акты)
  const { data: debtorDocs } = await supabase
    .from("accounting_documents")
    .select("counterparty_id, total, counterparty:accounting_counterparties(id, short_name)")
    .eq("company_id", companyId)
    .in("document_type", ["invoice", "act", "upd"])
    .eq("status", "issued")
    .is("deleted_at", null);
  
  const debtorMap = new Map<string, { name: string; amount: number; count: number }>();
  debtorDocs?.forEach(doc => {
    const cpData = doc.counterparty as unknown;
    const cp = Array.isArray(cpData) ? cpData[0] : cpData;
    if (!cp || typeof cp !== 'object' || !('id' in cp)) return;
    const cpTyped = cp as { id: string; short_name: string };
    const existing = debtorMap.get(cpTyped.id) || { name: cpTyped.short_name, amount: 0, count: 0 };
    existing.amount += doc.total || 0;
    existing.count += 1;
    debtorMap.set(cpTyped.id, existing);
  });
  
  const debtors: DebtorCreditor[] = Array.from(debtorMap.entries())
    .map(([id, data]) => ({
      counterparty_id: id,
      counterparty_name: data.name,
      amount: data.amount,
      documents_count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  
  // Кредиторская задолженность (неоплаченные входящие документы)
  const { data: creditorDocs } = await supabase
    .from("accounting_documents")
    .select("counterparty_id, total, counterparty:accounting_counterparties(id, short_name)")
    .eq("company_id", companyId)
    .eq("direction", "incoming")
    .eq("status", "issued")
    .is("deleted_at", null);
  
  const creditorMap = new Map<string, { name: string; amount: number; count: number }>();
  creditorDocs?.forEach(doc => {
    const cpData = doc.counterparty as unknown;
    const cp = Array.isArray(cpData) ? cpData[0] : cpData;
    if (!cp || typeof cp !== 'object' || !('id' in cp)) return;
    const cpTyped = cp as { id: string; short_name: string };
    const existing = creditorMap.get(cpTyped.id) || { name: cpTyped.short_name, amount: 0, count: 0 };
    existing.amount += doc.total || 0;
    existing.count += 1;
    creditorMap.set(cpTyped.id, existing);
  });
  
  const creditors: DebtorCreditor[] = Array.from(creditorMap.entries())
    .map(([id, data]) => ({
      counterparty_id: id,
      counterparty_name: data.name,
      amount: data.amount,
      documents_count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  
  // Топ контрагентов по обороту
  const { data: allDocs } = await supabase
    .from("accounting_documents")
    .select("counterparty_id, document_type, total, direction, counterparty:accounting_counterparties(id, short_name)")
    .eq("company_id", companyId)
    .gte("document_date", startDate)
    .lte("document_date", endDate)
    .is("deleted_at", null);
  
  const topMap = new Map<string, { name: string; income: number; expense: number }>();
  allDocs?.forEach(doc => {
    const cpData = doc.counterparty as unknown;
    const cp = Array.isArray(cpData) ? cpData[0] : cpData;
    if (!cp || typeof cp !== 'object' || !('id' in cp)) return;
    const cpTyped = cp as { id: string; short_name: string };
    const existing = topMap.get(cpTyped.id) || { name: cpTyped.short_name, income: 0, expense: 0 };
    if (doc.direction === "outgoing") {
      existing.income += doc.total || 0;
    } else {
      existing.expense += doc.total || 0;
    }
    topMap.set(cpTyped.id, existing);
  });
  
  const topCounterparties: TopCounterparty[] = Array.from(topMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      income: data.income,
      expense: data.expense,
      total: data.income + data.expense,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  return {
    monthlyStats,
    debtors,
    creditors,
    topCounterparties,
    totalDebt: debtors.reduce((sum, d) => sum + d.amount, 0),
    totalCredit: creditors.reduce((sum, c) => sum + c.amount, 0),
  };
}

// ============================================
// Статистика для дашборда
// ============================================

export async function getAccountingDashboardStats(year?: number): Promise<{
  totalIncome: number;
  totalExpense: number;
  profit: number;
  unpaidInvoices: number;
  unpaidInvoicesAmount: number;
  upcomingTaxes: number;
  upcomingTaxesAmount: number;
  documentsCount: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  const currentYear = year || new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1).toISOString().split("T")[0];
  const endDate = new Date(currentYear, 11, 31).toISOString().split("T")[0];
  
  if (!companyId) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      profit: 0,
      unpaidInvoices: 0,
      unpaidInvoicesAmount: 0,
      upcomingTaxes: 0,
      upcomingTaxesAmount: 0,
      documentsCount: 0,
    };
  }
  
  // Получаем данные из КУДиР
  const { data: kudirData } = await supabase
    .from("kudir_entries")
    .select("income, expense")
    .eq("company_id", companyId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate);
  
  const totalIncome = kudirData?.reduce((sum, e) => sum + (e.income || 0), 0) || 0;
  const totalExpense = kudirData?.reduce((sum, e) => sum + (e.expense || 0), 0) || 0;
  
  // Неоплаченные счета
  const { data: unpaidData } = await supabase
    .from("accounting_documents")
    .select("id, total")
    .eq("company_id", companyId)
    .eq("document_type", "invoice")
    .eq("status", "issued")
    .is("deleted_at", null);
  
  const unpaidInvoices = unpaidData?.length || 0;
  const unpaidInvoicesAmount = unpaidData?.reduce((sum, d) => sum + (d.total || 0), 0) || 0;
  
  // Предстоящие налоги
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  const { data: taxData } = await supabase
    .from("tax_payments")
    .select("id, calculated_amount, paid_amount")
    .eq("company_id", companyId)
    .in("status", ["pending", "partial"])
    .gte("due_date", today)
    .lte("due_date", futureDate);
  
  const upcomingTaxes = taxData?.length || 0;
  const upcomingTaxesAmount = taxData?.reduce(
    (sum, t) => sum + ((t.calculated_amount || 0) - (t.paid_amount || 0)), 
    0
  ) || 0;
  
  // Количество документов за год
  const { count: documentsCount } = await supabase
    .from("accounting_documents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("document_date", startDate)
    .lte("document_date", endDate)
    .is("deleted_at", null);
  
  return {
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    unpaidInvoices,
    unpaidInvoicesAmount,
    upcomingTaxes,
    upcomingTaxesAmount,
    documentsCount: documentsCount || 0,
  };
}
