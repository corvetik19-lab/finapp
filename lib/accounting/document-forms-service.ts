"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// Типы документов
export type DocumentFormType = 
  | "invoice"           // Счёт на оплату
  | "act"               // Акт выполненных работ
  | "invoice_factura"   // Счёт-фактура
  | "upd"               // Универсальный передаточный документ
  | "waybill"           // Товарная накладная (ТОРГ-12)
  | "payment_order"     // Платёжное поручение
  | "contract";         // Договор

export type DocumentStatus = "draft" | "issued" | "paid" | "cancelled";

// Позиция документа
export interface DocumentItem {
  id?: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  price: number;           // В копейках
  vatRate: number;         // 0, 10, 20
  vatAmount: number;       // В копейках
  totalAmount: number;     // В копейках (с НДС)
}

// Данные документа
export interface DocumentFormData {
  id?: string;
  documentType: DocumentFormType;
  documentNumber: string;
  documentDate: string;
  
  // Контрагент
  counterpartyId?: string;
  counterpartyName: string;
  counterpartyInn?: string;
  counterpartyKpp?: string;
  counterpartyAddress?: string;
  counterpartyBank?: string;
  counterpartyBik?: string;
  counterpartyAccount?: string;
  
  // Позиции
  items: DocumentItem[];
  
  // Суммы
  subtotalAmount: number;  // Без НДС
  vatAmount: number;       // Сумма НДС
  totalAmount: number;     // Итого с НДС
  
  // Дополнительно
  status: DocumentStatus;
  notes?: string;
  paymentDueDate?: string;
  paymentDate?: string;
  tenderId?: string;
  
  // Для счёт-фактуры
  correctionNumber?: string;
  correctionDate?: string;
  
  // Для договора
  contractNumber?: string;
  contractDate?: string;
  contractSubject?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

// Получить данные организации для документа
export async function getOrganizationForDocument(): Promise<{
  name: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  directorName?: string;
  accountantName?: string;
} | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: settings } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (!settings) return null;

  return {
    name: settings.organization_name || "",
    inn: settings.inn || "",
    kpp: settings.kpp,
    ogrn: settings.ogrn,
    address: settings.legal_address,
    bankName: settings.bank_name,
    bik: settings.bik,
    checkingAccount: settings.checking_account,
    correspondentAccount: settings.correspondent_account,
    directorName: settings.director_name,
    accountantName: settings.accountant_name,
  };
}

// Получить следующий номер документа
export async function getNextDocumentNumber(
  documentType: DocumentFormType
): Promise<string> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return "1";

  const year = new Date().getFullYear();
  const prefix = getDocumentPrefix(documentType);

  const { data } = await supabase
    .from("accounting_documents")
    .select("document_number")
    .eq("company_id", companyId)
    .eq("document_type", documentType)
    .ilike("document_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return `${prefix}${year}-001`;
  }

  // Извлекаем номер и увеличиваем
  const match = data.document_number.match(/(\d+)$/);
  const lastNum = match ? parseInt(match[1]) : 0;
  const nextNum = String(lastNum + 1).padStart(3, "0");

  return `${prefix}${year}-${nextNum}`;
}

function getDocumentPrefix(type: DocumentFormType): string {
  const prefixes: Record<DocumentFormType, string> = {
    invoice: "СЧ",
    act: "АКТ",
    invoice_factura: "СФ",
    upd: "УПД",
    waybill: "ТН",
    payment_order: "ПП",
    contract: "ДОГ",
  };
  return prefixes[type] || "";
}

// Создать документ
export async function createDocument(
  data: DocumentFormData
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Создаём документ
  const { data: doc, error: docError } = await supabase
    .from("accounting_documents")
    .insert({
      company_id: companyId,
      document_type: data.documentType,
      document_number: data.documentNumber,
      document_date: data.documentDate,
      counterparty_id: data.counterpartyId || null,
      total_amount: data.totalAmount,
      vat_amount: data.vatAmount,
      payment_status: data.status === "paid" ? "paid" : "pending",
      payment_due_date: data.paymentDueDate || null,
      payment_date: data.paymentDate || null,
      tender_id: data.tenderId || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (docError) {
    console.error("Error creating document:", docError);
    return { success: false, error: "Ошибка создания документа" };
  }

  // Создаём позиции
  if (data.items.length > 0) {
    const items = data.items.map((item, idx) => ({
      document_id: doc.id,
      position: idx + 1,
      name: item.name,
      description: item.description || null,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      vat_rate: item.vatRate,
      vat_amount: item.vatAmount,
      total_amount: item.totalAmount,
    }));

    const { error: itemsError } = await supabase
      .from("accounting_document_items")
      .insert(items);

    if (itemsError) {
      console.error("Error creating document items:", itemsError);
    }
  }

  return { success: true, documentId: doc.id };
}

// Обновить документ
export async function updateDocument(
  documentId: string,
  data: Partial<DocumentFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {};

  if (data.documentNumber) updateData.document_number = data.documentNumber;
  if (data.documentDate) updateData.document_date = data.documentDate;
  if (data.counterpartyId) updateData.counterparty_id = data.counterpartyId;
  if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
  if (data.vatAmount !== undefined) updateData.vat_amount = data.vatAmount;
  if (data.status) updateData.payment_status = data.status === "paid" ? "paid" : "pending";
  if (data.paymentDueDate) updateData.payment_due_date = data.paymentDueDate;
  if (data.paymentDate) updateData.payment_date = data.paymentDate;
  if (data.notes !== undefined) updateData.notes = data.notes;

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("accounting_documents")
    .update(updateData)
    .eq("id", documentId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error updating document:", error);
    return { success: false, error: "Ошибка обновления документа" };
  }

  // Обновляем позиции если переданы
  if (data.items) {
    // Удаляем старые позиции
    await supabase
      .from("accounting_document_items")
      .delete()
      .eq("document_id", documentId);

    // Создаём новые
    const items = data.items.map((item, idx) => ({
      document_id: documentId,
      position: idx + 1,
      name: item.name,
      description: item.description || null,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      vat_rate: item.vatRate,
      vat_amount: item.vatAmount,
      total_amount: item.totalAmount,
    }));

    await supabase.from("accounting_document_items").insert(items);
  }

  return { success: true };
}

// Изменить статус документа
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  paymentDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {
    payment_status: status === "paid" ? "paid" : status === "cancelled" ? "cancelled" : "pending",
    updated_at: new Date().toISOString(),
  };

  if (status === "paid" && paymentDate) {
    updateData.payment_date = paymentDate;
  }

  const { error } = await supabase
    .from("accounting_documents")
    .update(updateData)
    .eq("id", documentId)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, error: "Ошибка изменения статуса" };
  }

  return { success: true };
}

// Копировать документ
export async function copyDocument(
  documentId: string,
  newDocumentNumber?: string
): Promise<{ success: boolean; newDocumentId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем исходный документ
  const { data: original } = await supabase
    .from("accounting_documents")
    .select(`
      *,
      accounting_document_items(*)
    `)
    .eq("id", documentId)
    .eq("company_id", companyId)
    .single();

  if (!original) {
    return { success: false, error: "Документ не найден" };
  }

  // Получаем новый номер
  const docNumber = newDocumentNumber || await getNextDocumentNumber(original.document_type);

  // Создаём копию
  const { data: newDoc, error: createError } = await supabase
    .from("accounting_documents")
    .insert({
      company_id: companyId,
      document_type: original.document_type,
      document_number: docNumber,
      document_date: new Date().toISOString().split("T")[0],
      counterparty_id: original.counterparty_id,
      total_amount: original.total_amount,
      vat_amount: original.vat_amount,
      payment_status: "pending",
      payment_due_date: null,
      payment_date: null,
      tender_id: original.tender_id,
      notes: original.notes,
    })
    .select()
    .single();

  if (createError || !newDoc) {
    return { success: false, error: "Ошибка копирования документа" };
  }

  // Копируем позиции
  const items = original.accounting_document_items as Array<{
    position: number;
    name: string;
    description: string | null;
    unit: string;
    quantity: number;
    price: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;
  }>;

  if (items && items.length > 0) {
    const newItems = items.map(item => ({
      document_id: newDoc.id,
      position: item.position,
      name: item.name,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      vat_rate: item.vat_rate,
      vat_amount: item.vat_amount,
      total_amount: item.total_amount,
    }));

    await supabase.from("accounting_document_items").insert(newItems);
  }

  return { success: true, newDocumentId: newDoc.id };
}

// Получить документ с позициями для формы
export async function getDocumentForForm(
  documentId: string
): Promise<DocumentFormData | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data } = await supabase
    .from("accounting_documents")
    .select(`
      *,
      accounting_document_items(*),
      accounting_counterparties(*)
    `)
    .eq("id", documentId)
    .eq("company_id", companyId)
    .single();

  if (!data) return null;

  const counterparty = data.accounting_counterparties as {
    name: string;
    inn: string;
    kpp: string | null;
    legal_address: string | null;
    bank_name: string | null;
    bik: string | null;
    checking_account: string | null;
  } | null;

  const items = (data.accounting_document_items as Array<{
    id: string;
    name: string;
    description: string | null;
    unit: string;
    quantity: number;
    price: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;
  }>) || [];

  const subtotalAmount = items.reduce((sum, i) => sum + (i.total_amount - i.vat_amount), 0);

  return {
    id: data.id,
    documentType: data.document_type,
    documentNumber: data.document_number,
    documentDate: data.document_date,
    counterpartyId: data.counterparty_id,
    counterpartyName: counterparty?.name || "",
    counterpartyInn: counterparty?.inn,
    counterpartyKpp: counterparty?.kpp || undefined,
    counterpartyAddress: counterparty?.legal_address || undefined,
    counterpartyBank: counterparty?.bank_name || undefined,
    counterpartyBik: counterparty?.bik || undefined,
    counterpartyAccount: counterparty?.checking_account || undefined,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      vatRate: item.vat_rate,
      vatAmount: item.vat_amount,
      totalAmount: item.total_amount,
    })),
    subtotalAmount,
    vatAmount: data.vat_amount || 0,
    totalAmount: data.total_amount,
    status: data.payment_status === "paid" ? "paid" : data.payment_status === "cancelled" ? "cancelled" : "draft",
    notes: data.notes || undefined,
    paymentDueDate: data.payment_due_date || undefined,
    paymentDate: data.payment_date || undefined,
    tenderId: data.tender_id || undefined,
  };
}

// Вспомогательные функции для расчётов
export function calculateItemTotals(
  quantity: number,
  price: number,
  vatRate: number
): { vatAmount: number; totalAmount: number } {
  const baseAmount = quantity * price;
  const vatAmount = Math.round(baseAmount * vatRate / 100);
  const totalAmount = baseAmount + vatAmount;
  return { vatAmount, totalAmount };
}

export function calculateDocumentTotals(
  items: DocumentItem[]
): { subtotalAmount: number; vatAmount: number; totalAmount: number } {
  let subtotalAmount = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  for (const item of items) {
    subtotalAmount += item.quantity * item.price;
    vatAmount += item.vatAmount;
    totalAmount += item.totalAmount;
  }

  return { subtotalAmount, vatAmount, totalAmount };
}

// Названия документов
export const DOCUMENT_TYPE_NAMES: Record<DocumentFormType, string> = {
  invoice: "Счёт на оплату",
  act: "Акт выполненных работ",
  invoice_factura: "Счёт-фактура",
  upd: "УПД",
  waybill: "Товарная накладная",
  payment_order: "Платёжное поручение",
  contract: "Договор",
};

export const DOCUMENT_STATUS_NAMES: Record<DocumentStatus, string> = {
  draft: "Черновик",
  issued: "Выставлен",
  paid: "Оплачен",
  cancelled: "Отменён",
};
