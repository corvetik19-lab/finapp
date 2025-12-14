"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type { Investment } from "./types";
import { getInvestmentById } from "./service";

// ============================================
// Интеграция инвестиций с бухгалтерией
// ============================================

export type InvestmentDocumentType = 
  | "loan_agreement"     // Договор займа
  | "receipt"            // Приходный ордер
  | "payment_order"      // Платёжное поручение (возврат)
  | "interest_invoice";  // Счёт на проценты

interface CreateDocumentInput {
  investmentId: string;
  documentType: InvestmentDocumentType;
  documentDate?: string;
  documentNumber?: string;
}

interface DocumentResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

/**
 * Создание бухгалтерского документа из инвестиции
 */
export async function createDocumentFromInvestment(
  input: CreateDocumentInput
): Promise<DocumentResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const investment = await getInvestmentById(input.investmentId);
  if (!investment) {
    return { success: false, error: "Инвестиция не найдена" };
  }

  // Получаем или создаём контрагента (источник финансирования)
  const counterpartyId = await findOrCreateInvestorCounterparty(
    companyId,
    investment.source
  );

  const documentNumber = input.documentNumber || await generateDocumentNumber(
    companyId,
    input.documentType
  );

  // Определяем параметры документа в зависимости от типа
  const docParams = getDocumentParams(input.documentType, investment);

  const { data: document, error: docError } = await supabase
    .from("accounting_documents")
    .insert({
      company_id: companyId,
      document_type: mapToAccountingDocType(input.documentType),
      document_number: documentNumber,
      document_date: input.documentDate || new Date().toISOString().split("T")[0],
      counterparty_id: counterpartyId,
      total_amount: docParams.amount,
      vat_amount: 0, // Займы не облагаются НДС
      currency: "RUB",
      payment_status: "pending",
      status: "draft",
      direction: docParams.direction,
      description: docParams.description,
      metadata: {
        investment_id: investment.id,
        investment_number: investment.investment_number,
        source_name: investment.source?.name,
        document_subtype: input.documentType,
      },
    })
    .select()
    .single();

  if (docError || !document) {
    console.error("Error creating document:", docError);
    return { success: false, error: "Ошибка создания документа" };
  }

  return { success: true, documentId: document.id };
}

/**
 * Добавление процентов инвестиции в затраты тендера
 */
export async function addInvestmentInterestToTenderExpenses(
  investmentId: string
): Promise<{ success: boolean; expenseId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const investment = await getInvestmentById(investmentId);
  if (!investment) {
    return { success: false, error: "Инвестиция не найдена" };
  }

  if (!investment.tender_id) {
    return { success: false, error: "Инвестиция не привязана к тендеру" };
  }

  // Проверяем, не добавлены ли уже проценты
  const { data: existing } = await supabase
    .from("tender_expenses")
    .select("id")
    .eq("company_id", companyId)
    .eq("tender_id", investment.tender_id)
    .eq("source_type", "investment_interest")
    .eq("metadata->>investment_id", investmentId)
    .single();

  if (existing) {
    return { success: false, error: "Проценты уже добавлены в затраты тендера" };
  }

  // Создаём запись расхода
  const { data: expense, error } = await supabase
    .from("tender_expenses")
    .insert({
      company_id: companyId,
      tender_id: investment.tender_id,
      source_type: "investment_interest",
      expense_date: investment.investment_date,
      description: `Проценты по инвестиции ${investment.investment_number} (${investment.source?.name})`,
      amount: investment.interest_amount,
      category: "overhead",
      counterparty_name: investment.source?.name,
      metadata: {
        investment_id: investmentId,
        investment_number: investment.investment_number,
        interest_rate: investment.interest_rate,
        interest_type: investment.interest_type,
        period_days: investment.period_days,
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    return { success: false, error: error.message };
  }

  return { success: true, expenseId: expense.id };
}

/**
 * Удаление процентов инвестиции из затрат тендера
 */
export async function removeInvestmentInterestFromTenderExpenses(
  investmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_expenses")
    .delete()
    .eq("company_id", companyId)
    .eq("source_type", "investment_interest")
    .eq("metadata->>investment_id", investmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Получение документов по инвестиции
 */
export async function getInvestmentDocuments(investmentId: string): Promise<{
  id: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  status: string;
}[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];

  const { data } = await supabase
    .from("accounting_documents")
    .select("id, document_type, document_number, document_date, total_amount, status, metadata")
    .eq("company_id", companyId)
    .eq("metadata->>investment_id", investmentId)
    .order("document_date", { ascending: false });

  return (data || []).map(doc => ({
    id: doc.id,
    documentType: (doc.metadata as Record<string, string>)?.document_subtype || doc.document_type,
    documentNumber: doc.document_number,
    documentDate: doc.document_date,
    totalAmount: doc.total_amount,
    status: doc.status,
  }));
}

/**
 * Создание записи КУДиР для инвестиции
 */
export async function createKudirEntryForInvestment(
  investmentId: string,
  entryType: "receipt" | "return_principal" | "return_interest"
): Promise<{ success: boolean; kudirEntryId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const investment = await getInvestmentById(investmentId);
  if (!investment) {
    return { success: false, error: "Инвестиция не найдена" };
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

  // Определяем параметры записи
  const entryParams = getKudirEntryParams(entryType, investment);

  const { data: kudirEntry, error } = await supabase
    .from("kudir_entries")
    .insert({
      company_id: companyId,
      entry_number: entryNumber,
      entry_date: new Date().toISOString().split("T")[0],
      entry_type: entryParams.kudirType,
      amount: entryParams.amount,
      description: entryParams.description,
      document_number: investment.investment_number,
      document_date: investment.investment_date,
      counterparty_name: investment.source?.name,
      metadata: {
        investment_id: investmentId,
        entry_subtype: entryType,
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating KUDIR entry:", error);
    return { success: false, error: "Ошибка создания записи КУДиР" };
  }

  return { success: true, kudirEntryId: kudirEntry.id };
}

// ============================================
// Вспомогательные функции
// ============================================

async function findOrCreateInvestorCounterparty(
  companyId: string,
  source: Investment["source"]
): Promise<string | null> {
  if (!source) return null;
  
  const supabase = await createRSCClient();

  // Ищем по ИНН или названию
  let query = supabase
    .from("accounting_counterparties")
    .select("id")
    .eq("company_id", companyId);

  if (source.inn) {
    query = query.eq("inn", source.inn);
  } else {
    query = query.ilike("name", `%${source.name.substring(0, 50)}%`);
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
      name: source.name,
      inn: source.inn,
      kpp: source.kpp,
      bank_name: source.bank_name,
      bank_bik: source.bank_bik,
      bank_account: source.bank_account,
      correspondent_account: source.correspondent_account,
      counterparty_type: "investor",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating counterparty:", error);
    return null;
  }

  return created?.id || null;
}

async function generateDocumentNumber(
  companyId: string,
  documentType: InvestmentDocumentType
): Promise<string> {
  const supabase = await createRSCClient();

  const prefixes: Record<InvestmentDocumentType, string> = {
    loan_agreement: "ДЗ",
    receipt: "ПКО",
    payment_order: "ПП",
    interest_invoice: "СЧ-ПР",
  };

  const prefix = prefixes[documentType];
  const year = new Date().getFullYear();

  const { data: lastDoc } = await supabase
    .from("accounting_documents")
    .select("document_number")
    .eq("company_id", companyId)
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

function mapToAccountingDocType(type: InvestmentDocumentType): string {
  const mapping: Record<InvestmentDocumentType, string> = {
    loan_agreement: "contract",
    receipt: "receipt",
    payment_order: "payment_order",
    interest_invoice: "invoice",
  };
  return mapping[type];
}

function getDocumentParams(type: InvestmentDocumentType, investment: Investment) {
  switch (type) {
    case "loan_agreement":
      return {
        amount: investment.approved_amount,
        direction: "incoming" as const,
        description: `Договор займа №${investment.investment_number} от ${investment.source?.name}`,
      };
    case "receipt":
      return {
        amount: investment.received_amount || investment.approved_amount,
        direction: "incoming" as const,
        description: `Получение займа по договору ${investment.investment_number}`,
      };
    case "payment_order":
      return {
        amount: investment.total_return_amount,
        direction: "outgoing" as const,
        description: `Возврат займа по договору ${investment.investment_number}`,
      };
    case "interest_invoice":
      return {
        amount: investment.interest_amount,
        direction: "outgoing" as const,
        description: `Проценты по займу ${investment.investment_number}`,
      };
  }
}

function getKudirEntryParams(type: "receipt" | "return_principal" | "return_interest", investment: Investment) {
  switch (type) {
    case "receipt":
      return {
        kudirType: "income" as const,
        amount: investment.received_amount || investment.approved_amount,
        description: `Получение займа от ${investment.source?.name} по договору ${investment.investment_number}`,
      };
    case "return_principal":
      return {
        kudirType: "expense" as const,
        amount: investment.approved_amount,
        description: `Возврат основного долга ${investment.source?.name} по договору ${investment.investment_number}`,
      };
    case "return_interest":
      return {
        kudirType: "expense" as const,
        amount: investment.interest_amount,
        description: `Уплата процентов ${investment.source?.name} по договору ${investment.investment_number}`,
      };
  }
}

// Типы документов для UI
export const INVESTMENT_DOCUMENT_TYPES: { value: InvestmentDocumentType; label: string }[] = [
  { value: "loan_agreement", label: "Договор займа" },
  { value: "receipt", label: "Приходный кассовый ордер" },
  { value: "payment_order", label: "Платёжное поручение" },
  { value: "interest_invoice", label: "Счёт на проценты" },
];
