/**
 * Сервис интеграции с банками для модуля инвесторов
 * Фаза 7: Автоматическое получение выписок, сверка платежей
 */

import { createRSCClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  counterparty: string;
  counterpartyInn?: string;
  counterpartyAccount?: string;
  purpose: string;
  documentNumber?: string;
  transactionType: "income" | "expense";
}

export interface BankStatement {
  accountNumber: string;
  bankName: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  transactions: BankTransaction[];
}

export interface MatchResult {
  bankTransactionId: string;
  investmentId?: string;
  investorSourceId?: string;
  matchType: "exact" | "partial" | "none";
  confidence: number;
  suggestions: string[];
}

/**
 * Парсит банковскую выписку из разных форматов
 */
export async function parseBankStatement(
  fileContent: string,
  format: "1c" | "csv" | "mt940"
): Promise<BankStatement | null> {
  try {
    switch (format) {
      case "1c":
        return parse1CStatement(fileContent);
      case "csv":
        return parseCSVStatement(fileContent);
      case "mt940":
        return parseMT940Statement(fileContent);
      default:
        logger.warn("Unknown bank statement format:", format);
        return null;
    }
  } catch (error) {
    logger.error("Error parsing bank statement:", error);
    return null;
  }
}

/**
 * Парсинг выписки в формате 1С
 */
function parse1CStatement(content: string): BankStatement {
  const lines = content.split("\n");
  const transactions: BankTransaction[] = [];
  
  let accountNumber = "";
  const bankName = "";
  let periodStart = "";
  let periodEnd = "";
  let openingBalance = 0;
  let closingBalance = 0;

  for (const line of lines) {
    const [key, value] = line.split("=").map((s) => s.trim());
    
    switch (key) {
      case "РасsчётСчёт":
      case "РасsчСчёт":
        accountNumber = value;
        break;
      case "ДатаНачала":
        periodStart = parseDate1C(value);
        break;
      case "ДатаКонца":
        periodEnd = parseDate1C(value);
        break;
      case "НачsальныйОстаток":
        openingBalance = parseFloat(value.replace(",", ".")) * 100;
        break;
      case "КонечsныйОстаток":
        closingBalance = parseFloat(value.replace(",", ".")) * 100;
        break;
      case "СекцияДокумент":
        // Start parsing a new transaction
        break;
    }
  }

  return {
    accountNumber,
    bankName,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    transactions,
  };
}

/**
 * Парсинг выписки в формате CSV
 */
function parseCSVStatement(content: string): BankStatement {
  const lines = content.split("\n");
  const transactions: BankTransaction[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(";").map((s) => s.replace(/"/g, "").trim());
    
    if (cols.length >= 6) {
      transactions.push({
        id: `csv-${i}`,
        date: cols[0],
        amount: Math.abs(parseFloat(cols[1].replace(",", ".").replace(/\s/g, "")) * 100),
        description: cols[2],
        counterparty: cols[3],
        counterpartyInn: cols[4],
        purpose: cols[5],
        transactionType: parseFloat(cols[1]) > 0 ? "income" : "expense",
      });
    }
  }

  return {
    accountNumber: "",
    bankName: "",
    periodStart: transactions[0]?.date || "",
    periodEnd: transactions[transactions.length - 1]?.date || "",
    openingBalance: 0,
    closingBalance: 0,
    transactions,
  };
}

/**
 * Парсинг выписки в формате MT940 (SWIFT)
 */
function parseMT940Statement(content: string): BankStatement {
  const transactions: BankTransaction[] = [];
  
  // MT940 parsing logic (simplified)
  const lines = content.split("\n");
  let currentTransaction: Partial<BankTransaction> = {};
  
  for (const line of lines) {
    if (line.startsWith(":61:")) {
      // Transaction line
      const dateStr = line.substring(4, 10);
      const amount = parseFloat(line.substring(15, 30).replace(",", "."));
      
      currentTransaction = {
        id: `mt940-${Date.now()}-${Math.random()}`,
        date: `20${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`,
        amount: Math.abs(amount * 100),
        transactionType: line.charAt(10) === "C" ? "income" : "expense",
      };
    } else if (line.startsWith(":86:") && currentTransaction.id) {
      // Description line
      currentTransaction.description = line.substring(4);
      currentTransaction.purpose = line.substring(4);
      currentTransaction.counterparty = extractCounterparty(line);
      
      transactions.push(currentTransaction as BankTransaction);
      currentTransaction = {};
    }
  }

  return {
    accountNumber: "",
    bankName: "",
    periodStart: transactions[0]?.date || "",
    periodEnd: transactions[transactions.length - 1]?.date || "",
    openingBalance: 0,
    closingBalance: 0,
    transactions,
  };
}

function parseDate1C(dateStr: string): string {
  // Convert DD.MM.YYYY to YYYY-MM-DD
  const [day, month, year] = dateStr.split(".");
  return `${year}-${month}-${day}`;
}

function extractCounterparty(description: string): string {
  // Extract counterparty name from description
  const match = description.match(/(?:от|для|ИП|ООО|ОАО|ЗАО|АО)\s+([А-Яа-яЁё\s]+)/i);
  return match ? match[1].trim() : "";
}

/**
 * Сопоставляет банковские транзакции с инвестициями
 */
export async function matchTransactionsWithInvestments(
  transactions: BankTransaction[]
): Promise<MatchResult[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  // Получаем все активные инвестиции
  const { data: investments } = await supabase
    .from("investments")
    .select(`
      id,
      investment_number,
      approved_amount,
      source:investment_sources!investments_source_id_fkey(
        id, name, inn, bank_account
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "in_progress"]);

  // Получаем все источники для сопоставления
  const { data: sources } = await supabase
    .from("investment_sources")
    .select("id, name, inn, bank_account")
    .eq("user_id", user.id);

  const results: MatchResult[] = [];

  for (const tx of transactions) {
    const result: MatchResult = {
      bankTransactionId: tx.id,
      matchType: "none",
      confidence: 0,
      suggestions: [],
    };

    // Попытка найти точное совпадение по ИНН
    if (tx.counterpartyInn && sources) {
      const matchedSource = sources.find((s) => s.inn === tx.counterpartyInn);
      if (matchedSource) {
        result.investorSourceId = matchedSource.id;
        result.matchType = "exact";
        result.confidence = 100;

        // Ищем инвестицию от этого источника
        type SourceType = { id: string; name: string; inn: string; bank_account: string } | null;
        const matchedInvestment = investments?.find(
          (inv) => (inv.source as unknown as SourceType)?.id === matchedSource.id
        );
        if (matchedInvestment) {
          result.investmentId = matchedInvestment.id;
        }
      }
    }

    // Попытка найти совпадение по номеру счёта
    if (result.matchType === "none" && tx.counterpartyAccount && sources) {
      const matchedSource = sources.find(
        (s) => s.bank_account === tx.counterpartyAccount
      );
      if (matchedSource) {
        result.investorSourceId = matchedSource.id;
        result.matchType = "exact";
        result.confidence = 95;
      }
    }

    // Попытка найти частичное совпадение по названию
    if (result.matchType === "none" && tx.counterparty && sources) {
      const normalizedCounterparty = tx.counterparty.toLowerCase();
      
      for (const source of sources) {
        const normalizedName = source.name.toLowerCase();
        
        if (normalizedCounterparty.includes(normalizedName) ||
            normalizedName.includes(normalizedCounterparty)) {
          result.investorSourceId = source.id;
          result.matchType = "partial";
          result.confidence = 70;
          result.suggestions.push(
            `Возможно: ${source.name} (совпадение по названию)`
          );
          break;
        }
      }
    }

    // Попытка найти по сумме
    if (result.matchType === "none" && investments) {
      const matchedByAmount = investments.filter(
        (inv) => inv.approved_amount === tx.amount
      );
      
      if (matchedByAmount.length === 1) {
        result.investmentId = matchedByAmount[0].id;
        type SourceType = { id: string } | null;
        result.investorSourceId = (matchedByAmount[0].source as unknown as SourceType)?.id;
        result.matchType = "partial";
        result.confidence = 50;
        result.suggestions.push(
          `Совпадение по сумме: ${matchedByAmount[0].investment_number}`
        );
      } else if (matchedByAmount.length > 1) {
        result.suggestions = matchedByAmount.map(
          (inv) => `Возможно: ${inv.investment_number} (совпадение по сумме)`
        );
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Создаёт транзакцию инвестиции из банковской операции
 */
export async function createInvestmentTransactionFromBank(
  bankTransaction: BankTransaction,
  investmentId: string,
  transactionType: "receipt" | "return"
): Promise<boolean> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase.from("investment_transactions").insert({
    user_id: user.id,
    investment_id: investmentId,
    transaction_type: transactionType,
    amount: bankTransaction.amount,
    transaction_date: bankTransaction.date,
    description: bankTransaction.purpose,
    payment_method: "bank_transfer",
    reference_number: bankTransaction.documentNumber,
    metadata: {
      bank_transaction_id: bankTransaction.id,
      counterparty: bankTransaction.counterparty,
      imported_at: new Date().toISOString(),
    },
  });

  if (error) {
    logger.error("Error creating investment transaction:", error);
    return false;
  }

  return true;
}

/**
 * Получает список банков для интеграции
 */
export function getSupportedBanks(): { id: string; name: string; apiSupported: boolean }[] {
  return [
    { id: "tinkoff", name: "Тинькофф Банк", apiSupported: true },
    { id: "sber", name: "Сбербанк", apiSupported: true },
    { id: "alfa", name: "Альфа-Банк", apiSupported: true },
    { id: "vtb", name: "ВТБ", apiSupported: false },
    { id: "raiffeisen", name: "Райффайзен Банк", apiSupported: false },
    { id: "otkritie", name: "Открытие", apiSupported: false },
    { id: "psb", name: "ПСБ", apiSupported: false },
    { id: "other", name: "Другой банк", apiSupported: false },
  ];
}
