"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export interface KudirEntryFull {
  id: string;
  companyId: string;
  entryNumber: number;
  entryDate: string;
  documentId: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  description: string;
  income: number;
  expense: number;
  counterpartyName: string | null;
  tenderId: string | null;
  createdAt: string;
}

export interface KudirQuarterSummary {
  quarter: number;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  entriesCount: number;
}

export interface KudirYearSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  entriesCount: number;
  quarters: KudirQuarterSummary[];
}

export interface KudirFilters {
  year?: number;
  quarter?: number;
  month?: number;
  entryType?: "income" | "expense" | "all";
  search?: string;
}

// Получить записи КУДиР с расширенными данными
export async function getKudirEntriesFull(
  filters: KudirFilters = {}
): Promise<KudirEntryFull[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("kudir_entries")
    .select(`
      id,
      company_id,
      entry_number,
      entry_date,
      document_id,
      description,
      income,
      expense,
      tender_id,
      created_at,
      accounting_documents(document_number, document_date),
      accounting_counterparties(name)
    `)
    .eq("company_id", companyId);

  // Фильтрация по году
  if (filters.year) {
    query = query
      .gte("entry_date", `${filters.year}-01-01`)
      .lte("entry_date", `${filters.year}-12-31`);
  }

  // Фильтрация по кварталу
  if (filters.quarter && filters.year) {
    const startMonth = (filters.quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const startDate = `${filters.year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDay = endMonth === 2 ? 28 : [4, 6, 9, 11].includes(endMonth) ? 30 : 31;
    const endDate = `${filters.year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
    query = query.gte("entry_date", startDate).lte("entry_date", endDate);
  }

  // Фильтрация по месяцу
  if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
    const lastDay = filters.month === 2 ? 28 : [4, 6, 9, 11].includes(filters.month) ? 30 : 31;
    const endDate = `${filters.year}-${String(filters.month).padStart(2, "0")}-${lastDay}`;
    query = query.gte("entry_date", startDate).lte("entry_date", endDate);
  }

  // Фильтрация по типу
  if (filters.entryType === "income") {
    query = query.gt("income", 0);
  } else if (filters.entryType === "expense") {
    query = query.gt("expense", 0);
  }

  // Поиск
  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  const { data, error } = await query.order("entry_date").order("entry_number");

  if (error) {
    console.error("Error fetching kudir entries:", error);
    return [];
  }

  return (data || []).map((entry) => {
    const docData = entry.accounting_documents as unknown as { document_number: string; document_date: string }[] | { document_number: string; document_date: string } | null;
    const doc = Array.isArray(docData) ? docData[0] : docData;
    const counterpartyData = entry.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
    const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;

    return {
      id: entry.id,
      companyId: entry.company_id,
      entryNumber: entry.entry_number,
      entryDate: entry.entry_date,
      documentId: entry.document_id,
      documentNumber: doc?.document_number || null,
      documentDate: doc?.document_date || null,
      description: entry.description,
      income: entry.income || 0,
      expense: entry.expense || 0,
      counterpartyName: counterparty?.name || null,
      tenderId: entry.tender_id,
      createdAt: entry.created_at,
    };
  });
}

// Получить итоги по кварталам за год
export async function getKudirQuarterSummaries(year: number): Promise<KudirQuarterSummary[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const summaries: KudirQuarterSummary[] = [];

  for (let q = 1; q <= 4; q++) {
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDay = endMonth === 2 ? 28 : [4, 6, 9, 11].includes(endMonth) ? 30 : 31;
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

    const { data } = await supabase
      .from("kudir_entries")
      .select("income, expense")
      .eq("company_id", companyId)
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    const totalIncome = (data || []).reduce((sum, e) => sum + (e.income || 0), 0);
    const totalExpense = (data || []).reduce((sum, e) => sum + (e.expense || 0), 0);

    summaries.push({
      quarter: q,
      startDate,
      endDate,
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      entriesCount: data?.length || 0,
    });
  }

  return summaries;
}

// Получить годовой итог
export async function getKudirYearSummary(year: number): Promise<KudirYearSummary> {
  const quarters = await getKudirQuarterSummaries(year);

  const totalIncome = quarters.reduce((sum, q) => sum + q.totalIncome, 0);
  const totalExpense = quarters.reduce((sum, q) => sum + q.totalExpense, 0);
  const entriesCount = quarters.reduce((sum, q) => sum + q.entriesCount, 0);

  return {
    year,
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    entriesCount,
    quarters,
  };
}

// Создать запись КУДиР
export async function createKudirEntryManual(input: {
  entryDate: string;
  description: string;
  income?: number;
  expense?: number;
  documentId?: string;
  tenderId?: string;
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем следующий номер записи
  const { data: lastEntry } = await supabase
    .from("kudir_entries")
    .select("entry_number")
    .eq("company_id", companyId)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (lastEntry?.entry_number || 0) + 1;

  const { data, error } = await supabase
    .from("kudir_entries")
    .insert({
      company_id: companyId,
      entry_number: nextNumber,
      entry_date: input.entryDate,
      description: input.description,
      income: input.income || 0,
      expense: input.expense || 0,
      document_id: input.documentId || null,
      tender_id: input.tenderId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating kudir entry:", error);
    return { success: false, error: "Ошибка создания записи" };
  }

  return { success: true, entryId: data.id };
}

// Удалить запись КУДиР
export async function deleteKudirEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("kudir_entries")
    .delete()
    .eq("id", entryId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting kudir entry:", error);
    return { success: false, error: "Ошибка удаления записи" };
  }

  return { success: true };
}

// Автозаполнение КУДиР из документов
export async function syncKudirFromDocuments(
  year: number
): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, created: 0, error: "Компания не найдена" };
  }

  // Получаем оплаченные документы без записей в КУДиР
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select(`
      id,
      document_type,
      document_number,
      document_date,
      payment_date,
      total_amount,
      counterparty_id,
      tender_id,
      accounting_counterparties(name)
    `)
    .eq("company_id", companyId)
    .eq("payment_status", "paid")
    .gte("payment_date", `${year}-01-01`)
    .lte("payment_date", `${year}-12-31`);

  if (!documents || documents.length === 0) {
    return { success: true, created: 0 };
  }

  // Проверяем, какие документы уже есть в КУДиР
  const { data: existingEntries } = await supabase
    .from("kudir_entries")
    .select("document_id")
    .eq("company_id", companyId)
    .in("document_id", documents.map(d => d.id));

  const existingDocIds = new Set((existingEntries || []).map(e => e.document_id));

  // Фильтруем документы, которых ещё нет
  const newDocuments = documents.filter(d => !existingDocIds.has(d.id));

  if (newDocuments.length === 0) {
    return { success: true, created: 0 };
  }

  // Получаем следующий номер записи
  const { data: lastEntry } = await supabase
    .from("kudir_entries")
    .select("entry_number")
    .eq("company_id", companyId)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = (lastEntry?.entry_number || 0) + 1;

  // Создаём записи
  const entries = newDocuments.map(doc => {
    const counterpartyData = doc.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
    const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
    const isIncome = ["invoice", "act", "invoice_upd"].includes(doc.document_type);

    const entry = {
      company_id: companyId,
      entry_number: nextNumber++,
      entry_date: doc.payment_date,
      document_id: doc.id,
      description: `${doc.document_type === "invoice" ? "Счёт" : doc.document_type === "act" ? "Акт" : "Документ"} №${doc.document_number}${counterparty ? ` от ${counterparty.name}` : ""}`,
      income: isIncome ? doc.total_amount : 0,
      expense: isIncome ? 0 : doc.total_amount,
      tender_id: doc.tender_id,
    };

    return entry;
  });

  const { error } = await supabase.from("kudir_entries").insert(entries);

  if (error) {
    console.error("Error syncing kudir from documents:", error);
    return { success: false, created: 0, error: "Ошибка синхронизации" };
  }

  return { success: true, created: entries.length };
}

// Экспорт данных для Excel/PDF
export async function getKudirExportData(year: number): Promise<{
  entries: KudirEntryFull[];
  summary: KudirYearSummary;
}> {
  const [entries, summary] = await Promise.all([
    getKudirEntriesFull({ year }),
    getKudirYearSummary(year),
  ]);

  return { entries, summary };
}
