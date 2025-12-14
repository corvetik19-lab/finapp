"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

interface DocumentMatch {
  documentId: string;
  documentNumber: string;
  documentType: string;
  documentDate: string;
  counterpartyName: string;
  totalAmount: number;
  confidence: number;
  matchReason: string;
}

// Поиск документов, соответствующих транзакции
export async function findMatchingDocuments(
  transactionId: string
): Promise<DocumentMatch[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];

  // Получаем транзакцию
  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction) return [];

  const matches: DocumentMatch[] = [];

  // 1. Поиск по точной сумме и контрагенту
  if (transaction.counterparty_inn) {
    const { data: byCounterparty } = await supabase
      .from("accounting_documents")
      .select(`
        id,
        document_number,
        document_type,
        document_date,
        total_amount,
        accounting_counterparties!inner(name, inn)
      `)
      .eq("company_id", companyId)
      .eq("accounting_counterparties.inn", transaction.counterparty_inn)
      .gte("total_amount", transaction.amount * 0.99)
      .lte("total_amount", transaction.amount * 1.01)
      .is("linked_transaction_id", null)
      .limit(5);

    if (byCounterparty) {
      for (const doc of byCounterparty) {
        const counterpartyData = doc.accounting_counterparties as unknown as { name: string; inn: string }[] | { name: string; inn: string } | null;
        const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
        matches.push({
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          documentDate: doc.document_date,
          counterpartyName: counterparty?.name || "",
          totalAmount: doc.total_amount,
          confidence: 0.95,
          matchReason: "Совпадение по ИНН и сумме",
        });
      }
    }
  }

  // 2. Поиск по сумме в назначении платежа
  const purposeMatch = transaction.purpose?.match(/(?:счет|счёт|invoice)\s*[№#]?\s*(\d+)/i);
  if (purposeMatch) {
    const documentNumber = purposeMatch[1];
    
    const { data: byNumber } = await supabase
      .from("accounting_documents")
      .select(`
        id,
        document_number,
        document_type,
        document_date,
        total_amount,
        counterparty_id,
        accounting_counterparties(name)
      `)
      .eq("company_id", companyId)
      .ilike("document_number", `%${documentNumber}%`)
      .is("linked_transaction_id", null)
      .limit(5);

    if (byNumber) {
      for (const doc of byNumber) {
        // Проверяем, что документ ещё не добавлен
        if (!matches.find(m => m.documentId === doc.id)) {
          const counterpartyData = doc.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
          const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
          matches.push({
            documentId: doc.id,
            documentNumber: doc.document_number,
            documentType: doc.document_type,
            documentDate: doc.document_date,
            counterpartyName: counterparty?.name || "",
            totalAmount: doc.total_amount,
            confidence: 0.8,
            matchReason: `Совпадение номера документа: ${documentNumber}`,
          });
        }
      }
    }
  }

  // 3. Поиск по приблизительной сумме
  const { data: byAmount } = await supabase
    .from("accounting_documents")
    .select(`
      id,
      document_number,
      document_type,
      document_date,
      total_amount,
      accounting_counterparties(name)
    `)
    .eq("company_id", companyId)
    .gte("total_amount", transaction.amount * 0.98)
    .lte("total_amount", transaction.amount * 1.02)
    .is("linked_transaction_id", null)
    .limit(10);

  if (byAmount) {
    for (const doc of byAmount) {
      if (!matches.find(m => m.documentId === doc.id)) {
        const counterpartyData = doc.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
          const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
        matches.push({
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          documentDate: doc.document_date,
          counterpartyName: counterparty?.name || "",
          totalAmount: doc.total_amount,
          confidence: 0.5,
          matchReason: "Совпадение по сумме",
        });
      }
    }
  }

  // Сортируем по уверенности
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Связать транзакцию с документом
export async function linkTransactionToDocument(
  transactionId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Проверяем транзакцию
  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("id, accounting_document_id")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction) {
    return { success: false, error: "Транзакция не найдена" };
  }

  // Проверяем документ
  const { data: document } = await supabase
    .from("accounting_documents")
    .select("id, linked_transaction_id")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .single();

  if (!document) {
    return { success: false, error: "Документ не найден" };
  }

  // Обновляем транзакцию
  const { error: txError } = await supabase
    .from("bank_transactions")
    .update({
      accounting_document_id: documentId,
      processing_status: "processed",
    })
    .eq("id", transactionId);

  if (txError) {
    return { success: false, error: "Ошибка обновления транзакции" };
  }

  // Обновляем документ
  const { error: docError } = await supabase
    .from("accounting_documents")
    .update({
      linked_transaction_id: transactionId,
      payment_status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", documentId);

  if (docError) {
    return { success: false, error: "Ошибка обновления документа" };
  }

  return { success: true };
}

// Отвязать транзакцию от документа
export async function unlinkTransactionFromDocument(
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
    .select("id, accounting_document_id")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction) {
    return { success: false, error: "Транзакция не найдена" };
  }

  const documentId = transaction.accounting_document_id;

  // Обновляем транзакцию
  const { error: txError } = await supabase
    .from("bank_transactions")
    .update({
      accounting_document_id: null,
      processing_status: "pending",
    })
    .eq("id", transactionId);

  if (txError) {
    return { success: false, error: "Ошибка обновления транзакции" };
  }

  // Обновляем документ, если был связан
  if (documentId) {
    await supabase
      .from("accounting_documents")
      .update({
        linked_transaction_id: null,
        payment_status: "pending",
        payment_date: null,
      })
      .eq("id", documentId);
  }

  return { success: true };
}

// Автоматическое связывание транзакций с документами
export async function autoLinkTransactions(
  bankAccountId?: string
): Promise<{ processed: number; linked: number }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { processed: 0, linked: 0 };
  }

  // Получаем несвязанные транзакции
  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("company_id", companyId)
    .is("accounting_document_id", null)
    .in("processing_status", ["new", "pending"])
    .limit(50);

  if (bankAccountId) {
    query = query.eq("bank_account_id", bankAccountId);
  }

  const { data: transactions } = await query;

  if (!transactions) {
    return { processed: 0, linked: 0 };
  }

  let linked = 0;

  for (const tx of transactions) {
    const matches = await findMatchingDocuments(tx.id);
    
    // Автоматически связываем только при высокой уверенности
    const bestMatch = matches.find(m => m.confidence >= 0.9);
    
    if (bestMatch) {
      const result = await linkTransactionToDocument(tx.id, bestMatch.documentId);
      if (result.success) {
        linked++;
      }
    }
  }

  return { processed: transactions.length, linked };
}

// Получить связанный документ для транзакции
export async function getLinkedDocument(
  transactionId: string
): Promise<{
  id: string;
  documentNumber: string;
  documentType: string;
  documentDate: string;
  totalAmount: number;
  counterpartyName: string;
} | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("accounting_document_id")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction?.accounting_document_id) return null;

  const { data: document } = await supabase
    .from("accounting_documents")
    .select(`
      id,
      document_number,
      document_type,
      document_date,
      total_amount,
      accounting_counterparties(name)
    `)
    .eq("id", transaction.accounting_document_id)
    .single();

  if (!document) return null;

  const counterpartyData = document.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
  const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;

  return {
    id: document.id,
    documentNumber: document.document_number,
    documentType: document.document_type,
    documentDate: document.document_date,
    totalAmount: document.total_amount,
    counterpartyName: counterparty?.name || "",
  };
}
