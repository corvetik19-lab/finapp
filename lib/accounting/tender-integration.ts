"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

// Типы документов, которые можно создать из тендера
export type TenderDocumentType = 
  | "invoice"      // Счёт на оплату
  | "contract"     // Договор
  | "act"          // Акт выполненных работ
  | "invoice_upd"  // УПД
  | "waybill";     // Товарная накладная

interface CreateDocumentFromTenderInput {
  tenderId: string;
  documentType: TenderDocumentType;
  documentDate?: string;
  documentNumber?: string;
  includePositions?: boolean;
}

interface TenderDocumentResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

// Создание документа из тендера
export async function createDocumentFromTender(
  input: CreateDocumentFromTenderInput
): Promise<TenderDocumentResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем тендер
  const { data: tender, error: tenderError } = await supabase
    .from("tenders")
    .select(`
      *,
      type:tender_types(name),
      stage:tender_stages(name)
    `)
    .eq("id", input.tenderId)
    .eq("company_id", companyId)
    .single();

  if (tenderError || !tender) {
    return { success: false, error: "Тендер не найден" };
  }

  // Получаем или создаём контрагента на основе заказчика тендера
  const counterpartyId = await findOrCreateCounterparty(
    companyId,
    tender.customer,
    null // ИНН неизвестен
  );

  // Получаем номер документа
  const documentNumber = input.documentNumber || await generateDocumentNumber(
    companyId,
    input.documentType
  );

  // Определяем сумму документа
  const documentAmount = tender.contract_price || tender.our_price || tender.nmck;

  // Создаём документ
  const { data: document, error: docError } = await supabase
    .from("accounting_documents")
    .insert({
      company_id: companyId,
      document_type: input.documentType,
      document_number: documentNumber,
      document_date: input.documentDate || new Date().toISOString().split("T")[0],
      counterparty_id: counterpartyId,
      total_amount: documentAmount,
      vat_amount: Math.round(documentAmount * 20 / 120), // НДС 20%
      currency: tender.currency || "RUB",
      payment_status: "pending",
      status: "draft",
      tender_id: input.tenderId,
      description: `${tender.subject} (Тендер: ${tender.purchase_number})`,
      metadata: {
        tender_purchase_number: tender.purchase_number,
        tender_customer: tender.customer,
        tender_nmck: tender.nmck,
        tender_contract_price: tender.contract_price,
      },
    })
    .select()
    .single();

  if (docError || !document) {
    logger.error("Error creating document:", docError);
    return { success: false, error: "Ошибка создания документа" };
  }

  // Создаём позицию документа (предмет тендера)
  if (input.includePositions !== false) {
    await supabase.from("accounting_document_items").insert({
      document_id: document.id,
      name: tender.subject,
      quantity: 1,
      unit: "шт",
      price: documentAmount,
      vat_rate: 20,
      vat_amount: Math.round(documentAmount * 20 / 120),
      total: documentAmount,
    });
  }

  // Записываем связь в историю тендера
  await supabase.from("tender_field_history").insert({
    tender_id: input.tenderId,
    field_name: "accounting_document",
    old_value: null,
    new_value: document.id,
    changed_by: (await supabase.auth.getUser()).data.user?.id,
  });

  return { success: true, documentId: document.id };
}

// Поиск или создание контрагента
async function findOrCreateCounterparty(
  companyId: string,
  name: string,
  inn: string | null
): Promise<string | null> {
  const supabase = await createRSCClient();

  // Ищем существующего контрагента
  let query = supabase
    .from("accounting_counterparties")
    .select("id")
    .eq("company_id", companyId);

  if (inn) {
    query = query.eq("inn", inn);
  } else {
    query = query.ilike("name", `%${name.substring(0, 50)}%`);
  }

  const { data: existing } = await query.limit(1).single();

  if (existing) {
    return existing.id;
  }

  // Создаём нового контрагента
  const { data: created, error } = await supabase
    .from("accounting_counterparties")
    .insert({
      company_id: companyId,
      name: name.substring(0, 255),
      inn: inn,
      counterparty_type: "customer",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Error creating counterparty:", error);
    return null;
  }

  return created?.id || null;
}

// Генерация номера документа
async function generateDocumentNumber(
  companyId: string,
  documentType: TenderDocumentType
): Promise<string> {
  const supabase = await createRSCClient();

  const prefixes: Record<TenderDocumentType, string> = {
    invoice: "СЧ",
    contract: "Д",
    act: "АКТ",
    invoice_upd: "УПД",
    waybill: "ТН",
  };

  const prefix = prefixes[documentType] || "Д";
  const year = new Date().getFullYear();

  // Получаем последний номер
  const { data: lastDoc } = await supabase
    .from("accounting_documents")
    .select("document_number")
    .eq("company_id", companyId)
    .eq("document_type", documentType)
    .ilike("document_number", `${prefix}-%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastDoc?.document_number) {
    const match = lastDoc.document_number.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
}

// Получить документы, связанные с тендером
export async function getTenderDocuments(tenderId: string): Promise<{
  id: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
}[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];

  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("id, document_type, document_number, document_date, total_amount, payment_status, status")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("document_date", { ascending: false });

  return (documents || []).map(doc => ({
    id: doc.id,
    documentType: doc.document_type,
    documentNumber: doc.document_number,
    documentDate: doc.document_date,
    totalAmount: doc.total_amount,
    paymentStatus: doc.payment_status,
    status: doc.status,
  }));
}

// Создать запись КУДиР при оплате тендера
export async function createKudirEntryForTender(
  tenderId: string,
  amount: number,
  entryType: "income" | "expense",
  description?: string
): Promise<{ success: boolean; kudirEntryId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем тендер
  const { data: tender } = await supabase
    .from("tenders")
    .select("purchase_number, subject, customer")
    .eq("id", tenderId)
    .eq("company_id", companyId)
    .single();

  if (!tender) {
    return { success: false, error: "Тендер не найден" };
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

  // Формируем описание
  const entryDescription = description || 
    `${entryType === "income" ? "Оплата от" : "Оплата"} ${tender.customer}: ${tender.subject} (${tender.purchase_number})`;

  // Создаём запись КУДиР
  const { data: kudirEntry, error } = await supabase
    .from("kudir_entries")
    .insert({
      company_id: companyId,
      entry_number: entryNumber,
      entry_date: new Date().toISOString().split("T")[0],
      entry_type: entryType,
      amount: amount,
      description: entryDescription.substring(0, 500),
      document_number: tender.purchase_number,
      document_date: new Date().toISOString().split("T")[0],
      counterparty_name: tender.customer,
      tender_id: tenderId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating KUDIR entry:", error);
    return { success: false, error: "Ошибка создания записи КУДиР" };
  }

  return { success: true, kudirEntryId: kudirEntry.id };
}

// Получить финансовую сводку по тендеру
export async function getTenderFinancialSummary(tenderId: string): Promise<{
  documentsCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalExpenses: number;
  profit: number;
  kudirEntriesCount: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { documentsCount: 0, totalInvoiced: 0, totalPaid: 0, totalExpenses: 0, profit: 0, kudirEntriesCount: 0 };
  }

  // Документы по тендеру
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("total_amount, payment_status, document_type")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);

  // Записи КУДиР по тендеру
  const { data: kudirEntries } = await supabase
    .from("kudir_entries")
    .select("amount, entry_type")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);

  const totalInvoiced = (documents || [])
    .filter(d => ["invoice", "invoice_upd"].includes(d.document_type))
    .reduce((sum, d) => sum + (d.total_amount || 0), 0);

  const totalPaid = (documents || [])
    .filter(d => d.payment_status === "paid")
    .reduce((sum, d) => sum + (d.total_amount || 0), 0);

  const kudirIncome = (kudirEntries || [])
    .filter(e => e.entry_type === "income")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const kudirExpense = (kudirEntries || [])
    .filter(e => e.entry_type === "expense")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    documentsCount: documents?.length || 0,
    totalInvoiced,
    totalPaid,
    totalExpenses: kudirExpense,
    profit: kudirIncome - kudirExpense,
    kudirEntriesCount: kudirEntries?.length || 0,
  };
}

// Получить список тендеров для бухгалтерского отчёта
export async function getTendersForAccountingReport(filters: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  hasDocuments?: boolean;
}): Promise<{
  id: string;
  purchaseNumber: string;
  subject: string;
  customer: string;
  contractPrice: number | null;
  status: string;
  documentsCount: number;
  totalPaid: number;
}[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];

  // Базовый запрос тендеров
  let query = supabase
    .from("tenders")
    .select(`
      id,
      purchase_number,
      subject,
      customer,
      contract_price,
      status,
      created_at
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data: tenders } = await query.order("created_at", { ascending: false }).limit(100);

  if (!tenders) return [];

  // Получаем документы для всех тендеров
  const tenderIds = tenders.map(t => t.id);
  
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("tender_id, total_amount, payment_status")
    .eq("company_id", companyId)
    .in("tender_id", tenderIds);

  // Группируем документы по тендерам
  const docsByTender = (documents || []).reduce((acc, doc) => {
    if (!acc[doc.tender_id]) {
      acc[doc.tender_id] = { count: 0, paid: 0 };
    }
    acc[doc.tender_id].count++;
    if (doc.payment_status === "paid") {
      acc[doc.tender_id].paid += doc.total_amount || 0;
    }
    return acc;
  }, {} as Record<string, { count: number; paid: number }>);

  let results = tenders.map(t => ({
    id: t.id,
    purchaseNumber: t.purchase_number,
    subject: t.subject,
    customer: t.customer,
    contractPrice: t.contract_price,
    status: t.status,
    documentsCount: docsByTender[t.id]?.count || 0,
    totalPaid: docsByTender[t.id]?.paid || 0,
  }));

  // Фильтр по наличию документов
  if (filters.hasDocuments === true) {
    results = results.filter(t => t.documentsCount > 0);
  } else if (filters.hasDocuments === false) {
    results = results.filter(t => t.documentsCount === 0);
  }

  return results;
}
