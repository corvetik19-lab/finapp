"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { BankTransaction } from "./bank-types";
import { logger } from "@/lib/logger";

// Правила автоматической категоризации по ключевым словам
const CATEGORIZATION_RULES: {
  keywords: string[];
  categoryCode: string;
  categoryName: string;
  operationType: "income" | "expense";
}[] = [
  // Доходы
  { keywords: ["оплата по договору", "оплата по счету", "оплата счета"], categoryCode: "sales", categoryName: "Продажи", operationType: "income" },
  { keywords: ["возврат", "возмещение"], categoryCode: "refund", categoryName: "Возвраты", operationType: "income" },
  { keywords: ["аванс", "предоплата"], categoryCode: "prepayment", categoryName: "Авансы полученные", operationType: "income" },
  
  // Расходы - Зарплата
  { keywords: ["заработная плата", "зарплата", "аванс сотрудникам"], categoryCode: "salary", categoryName: "Зарплата", operationType: "expense" },
  { keywords: ["ндфл", "налог на доходы"], categoryCode: "ndfl", categoryName: "НДФЛ", operationType: "expense" },
  { keywords: ["страховые взносы", "пфр", "фсс", "ффомс"], categoryCode: "insurance", categoryName: "Страховые взносы", operationType: "expense" },
  
  // Расходы - Налоги
  { keywords: ["налог на прибыль"], categoryCode: "profit_tax", categoryName: "Налог на прибыль", operationType: "expense" },
  { keywords: ["ндс", "налог на добавленную стоимость"], categoryCode: "vat", categoryName: "НДС", operationType: "expense" },
  { keywords: ["усн", "упрощенн"], categoryCode: "usn", categoryName: "УСН", operationType: "expense" },
  { keywords: ["налог на имущество"], categoryCode: "property_tax", categoryName: "Налог на имущество", operationType: "expense" },
  
  // Расходы - Аренда
  { keywords: ["аренда", "арендная плата"], categoryCode: "rent", categoryName: "Аренда", operationType: "expense" },
  { keywords: ["коммунальные", "электроэнергия", "отопление", "водоснабжение"], categoryCode: "utilities", categoryName: "Коммунальные услуги", operationType: "expense" },
  
  // Расходы - Связь и интернет
  { keywords: ["интернет", "телефон", "связь", "мтс", "билайн", "мегафон", "теле2"], categoryCode: "telecom", categoryName: "Связь", operationType: "expense" },
  
  // Расходы - Банковские
  { keywords: ["комиссия банка", "банковская комиссия", "обслуживание счета"], categoryCode: "bank_fee", categoryName: "Банковские комиссии", operationType: "expense" },
  
  // Расходы - Закупки
  { keywords: ["закупка", "поставка товаров", "материалы"], categoryCode: "purchase", categoryName: "Закупки", operationType: "expense" },
  { keywords: ["канцтовары", "канцелярские"], categoryCode: "office", categoryName: "Канцтовары", operationType: "expense" },
  
  // Расходы - Услуги
  { keywords: ["консультационные услуги", "юридические услуги", "бухгалтерские услуги"], categoryCode: "consulting", categoryName: "Консалтинг", operationType: "expense" },
  { keywords: ["рекламные услуги", "маркетинг", "продвижение"], categoryCode: "marketing", categoryName: "Маркетинг", operationType: "expense" },
  { keywords: ["транспортные услуги", "доставка", "перевозка"], categoryCode: "transport", categoryName: "Транспорт", operationType: "expense" },
  
  // Расходы - Подписки и ПО
  { keywords: ["подписка", "лицензия", "программное обеспечение", "saas"], categoryCode: "software", categoryName: "ПО и подписки", operationType: "expense" },
];

interface CategorizationResult {
  categoryCode: string;
  categoryName: string;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

// Категоризация одной транзакции по назначению платежа
export function categorizeTransaction(
  purpose: string | null,
  operationType: "credit" | "debit"
): CategorizationResult | null {
  if (!purpose) return null;

  const purposeLower = purpose.toLowerCase();
  const opType = operationType === "credit" ? "income" : "expense";

  let bestMatch: CategorizationResult | null = null;
  let maxKeywords = 0;

  for (const rule of CATEGORIZATION_RULES) {
    if (rule.operationType !== opType) continue;

    const matchedKeywords: string[] = [];
    for (const keyword of rule.keywords) {
      if (purposeLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > maxKeywords) {
      maxKeywords = matchedKeywords.length;
      bestMatch = {
        categoryCode: rule.categoryCode,
        categoryName: rule.categoryName,
        confidence: Math.min(0.5 + matchedKeywords.length * 0.2, 1),
        matchedKeywords,
      };
    }
  }

  return bestMatch;
}

// Категоризация по контрагенту (история платежей)
export async function categorizeByCounterparty(
  counterpartyInn: string | null,
  operationType: "credit" | "debit"
): Promise<CategorizationResult | null> {
  if (!counterpartyInn) return null;

  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;

  // Ищем предыдущие транзакции с этим контрагентом, которые уже категоризированы
  const { data: previousTransactions } = await supabase
    .from("bank_transactions")
    .select("category, processing_status")
    .eq("company_id", companyId)
    .eq("counterparty_inn", counterpartyInn)
    .eq("operation_type", operationType)
    .eq("processing_status", "processed")
    .not("category", "is", null)
    .limit(10);

  if (!previousTransactions || previousTransactions.length === 0) {
    return null;
  }

  // Считаем наиболее частую категорию
  const categoryCounts: Record<string, number> = {};
  for (const tx of previousTransactions) {
    if (tx.category) {
      categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
    }
  }

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length === 0) return null;

  const [topCategory, count] = sortedCategories[0];
  const confidence = count / previousTransactions.length;

  return {
    categoryCode: topCategory,
    categoryName: topCategory,
    confidence,
    matchedKeywords: [`История: ${count} из ${previousTransactions.length} платежей`],
  };
}

// Автоматическая категоризация транзакции
export async function autoCategorizeTransaction(
  transaction: BankTransaction
): Promise<CategorizationResult | null> {
  // 1. Пробуем по контрагенту (история)
  const counterpartyResult = await categorizeByCounterparty(
    transaction.counterparty_inn,
    transaction.operation_type
  );
  
  if (counterpartyResult && counterpartyResult.confidence >= 0.7) {
    return counterpartyResult;
  }

  // 2. Пробуем по назначению платежа
  const purposeResult = categorizeTransaction(
    transaction.purpose,
    transaction.operation_type
  );

  // Возвращаем результат с большей уверенностью
  if (purposeResult && counterpartyResult) {
    return purposeResult.confidence >= counterpartyResult.confidence
      ? purposeResult
      : counterpartyResult;
  }

  return purposeResult || counterpartyResult;
}

// Массовая категоризация новых транзакций
export async function categorizeNewTransactions(
  bankAccountId?: string
): Promise<{ processed: number; categorized: number }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { processed: 0, categorized: 0 };
  }

  // Получаем некатегоризированные транзакции
  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("company_id", companyId)
    .eq("processing_status", "new")
    .is("category", null)
    .limit(100);

  if (bankAccountId) {
    query = query.eq("bank_account_id", bankAccountId);
  }

  const { data: transactions, error } = await query;

  if (error || !transactions) {
    logger.error("Error fetching transactions for categorization:", error);
    return { processed: 0, categorized: 0 };
  }

  let categorized = 0;

  for (const tx of transactions) {
    const result = await autoCategorizeTransaction(tx as BankTransaction);
    
    if (result && result.confidence >= 0.5) {
      await supabase
        .from("bank_transactions")
        .update({
          category: result.categoryCode,
          processing_status: result.confidence >= 0.8 ? "processed" : "pending",
        })
        .eq("id", tx.id);
      
      categorized++;
    }
  }

  return { processed: transactions.length, categorized };
}

// Применить категорию вручную
export async function applyTransactionCategory(
  transactionId: string,
  categoryCode: string
): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return false;

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      category: categoryCode,
      processing_status: "processed",
    })
    .eq("id", transactionId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error applying category:", error);
    return false;
  }

  return true;
}

// Получить предложенные категории для транзакции
export async function getSuggestedCategories(
  transactionId: string
): Promise<CategorizationResult[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("company_id", companyId)
    .single();

  if (!transaction) return [];

  const results: CategorizationResult[] = [];

  // По назначению
  const purposeResult = categorizeTransaction(
    transaction.purpose,
    transaction.operation_type
  );
  if (purposeResult) results.push(purposeResult);

  // По контрагенту
  const counterpartyResult = await categorizeByCounterparty(
    transaction.counterparty_inn,
    transaction.operation_type
  );
  if (counterpartyResult) results.push(counterpartyResult);

  // Сортируем по уверенности
  return results.sort((a, b) => b.confidence - a.confidence);
}
