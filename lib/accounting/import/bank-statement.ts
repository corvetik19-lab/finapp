"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// ============================================
// Типы для импорта банковской выписки
// ============================================

export interface BankStatementRow {
  date: string;
  documentNumber?: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  counterpartyAccount?: string;
  debit: number;      // Списание (расход)
  credit: number;     // Зачисление (приход)
  purpose: string;    // Назначение платежа
  balance?: number;
}

export interface ParsedBankStatement {
  accountNumber?: string;
  bankName?: string;
  bankBik?: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
  rows: BankStatementRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// ============================================
// Парсинг выписки в формате 1С (txt)
// ============================================

export async function parseBankStatement1C(content: string): Promise<ParsedBankStatement> {
  const lines = content.split("\n").map(l => l.trim());
  const result: ParsedBankStatement = {
    rows: [],
    totalDebit: 0,
    totalCredit: 0,
  };
  
  let inSection = false;
  let currentRow: Partial<BankStatementRow> = {};
  
  for (const line of lines) {
    if (!line) continue;
    
    // Разбираем ключ=значение
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    
    switch (key) {
      case "РасsчСчет":
      case "РасsчетныйСчет":
      case "РасsчСч":
        result.accountNumber = value;
        break;
      case "ДатаНачала":
        result.periodStart = parseDate1C(value);
        break;
      case "ДатаКонца":
        result.periodEnd = parseDate1C(value);
        break;
      case "НачsальныйОстаток":
        result.openingBalance = parseAmount(value);
        break;
      case "КонечныйОстаток":
        result.closingBalance = parseAmount(value);
        break;
      case "СекцияДокумент":
        inSection = true;
        currentRow = {};
        break;
      case "КонецДокумента":
        if (inSection && currentRow.date) {
          result.rows.push({
            date: currentRow.date,
            documentNumber: currentRow.documentNumber,
            counterpartyName: currentRow.counterpartyName,
            counterpartyInn: currentRow.counterpartyInn,
            counterpartyAccount: currentRow.counterpartyAccount,
            debit: currentRow.debit || 0,
            credit: currentRow.credit || 0,
            purpose: currentRow.purpose || "",
          });
          result.totalDebit += currentRow.debit || 0;
          result.totalCredit += currentRow.credit || 0;
        }
        inSection = false;
        break;
      case "Дата":
        if (inSection) currentRow.date = parseDate1C(value);
        break;
      case "Номер":
        if (inSection) currentRow.documentNumber = value;
        break;
      case "Плательщик":
      case "Получатель":
        if (inSection && !currentRow.counterpartyName) {
          currentRow.counterpartyName = value;
        }
        break;
      case "ПлательщикИНН":
      case "ПолучательИНН":
        if (inSection && !currentRow.counterpartyInn) {
          currentRow.counterpartyInn = value;
        }
        break;
      case "ПлательщикРасчСчет":
      case "ПолучательРасчСчет":
        if (inSection && !currentRow.counterpartyAccount) {
          currentRow.counterpartyAccount = value;
        }
        break;
      case "Сумма":
        if (inSection) {
          const amount = parseAmount(value);
          // Определяем направление по другим полям позже
          currentRow.credit = amount;
        }
        break;
      case "НазначениеПлатежа":
        if (inSection) currentRow.purpose = value;
        break;
    }
  }
  
  return result;
}

// ============================================
// Парсинг выписки в формате CSV
// ============================================

export async function parseBankStatementCSV(
  content: string,
  delimiter: string = ";"
): Promise<ParsedBankStatement> {
  const lines = content.split("\n").map(l => l.trim()).filter(l => l);
  const result: ParsedBankStatement = {
    rows: [],
    totalDebit: 0,
    totalCredit: 0,
  };
  
  if (lines.length < 2) {
    return result;
  }
  
  // Первая строка - заголовки
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  
  // Маппинг колонок
  const dateCol = findColumn(headers, ["дата", "date", "дата операции"]);
  const numberCol = findColumn(headers, ["номер", "№", "number", "номер документа"]);
  const counterpartyCol = findColumn(headers, ["контрагент", "плательщик", "получатель", "counterparty", "наименование"]);
  const innCol = findColumn(headers, ["инн", "inn"]);
  const debitCol = findColumn(headers, ["дебет", "списание", "расход", "debit", "сумма списания"]);
  const creditCol = findColumn(headers, ["кредит", "зачисление", "приход", "credit", "сумма зачисления"]);
  const purposeCol = findColumn(headers, ["назначение", "назначение платежа", "purpose", "описание"]);
  
  // Парсим строки
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length < 3) continue;
    
    const date = dateCol >= 0 ? parseDate(values[dateCol]) : null;
    if (!date) continue;
    
    const debit = debitCol >= 0 ? parseAmount(values[debitCol]) : 0;
    const credit = creditCol >= 0 ? parseAmount(values[creditCol]) : 0;
    
    // Если нет отдельных колонок дебет/кредит, пробуем найти одну колонку "сумма"
    let finalDebit = debit;
    let finalCredit = credit;
    
    if (debitCol < 0 && creditCol < 0) {
      const amountCol = findColumn(headers, ["сумма", "amount"]);
      if (amountCol >= 0) {
        const amount = parseAmount(values[amountCol]);
        // Пытаемся определить направление по знаку или другим признакам
        if (amount < 0) {
          finalDebit = Math.abs(amount);
        } else {
          finalCredit = amount;
        }
      }
    }
    
    const row: BankStatementRow = {
      date,
      documentNumber: numberCol >= 0 ? values[numberCol] : undefined,
      counterpartyName: counterpartyCol >= 0 ? values[counterpartyCol] : undefined,
      counterpartyInn: innCol >= 0 ? values[innCol] : undefined,
      debit: finalDebit,
      credit: finalCredit,
      purpose: purposeCol >= 0 ? values[purposeCol] : "",
    };
    
    result.rows.push(row);
    result.totalDebit += finalDebit;
    result.totalCredit += finalCredit;
  }
  
  return result;
}

// ============================================
// Импорт выписки в БД
// ============================================

export async function importBankStatement(
  statement: ParsedBankStatement,
  accountId: string,
  options: {
    skipDuplicates?: boolean;
    createCounterparties?: boolean;
  } = {}
): Promise<ImportResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, imported: 0, skipped: 0, errors: ["Не авторизован"] };
  }
  
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  };
  
  for (const row of statement.rows) {
    try {
      // Проверяем дубликаты
      if (options.skipDuplicates) {
        const { data: existing } = await supabase
          .from("bank_operations")
          .select("id")
          .eq("company_id", companyId)
          .eq("operation_date", row.date)
          .eq("amount", row.credit > 0 ? row.credit : -row.debit)
          .eq("purpose", row.purpose)
          .maybeSingle();
        
        if (existing) {
          result.skipped++;
          continue;
        }
      }
      
      // Ищем или создаём контрагента
      let counterpartyId: string | null = null;
      
      if (row.counterpartyInn && options.createCounterparties) {
        const { data: cp } = await supabase
          .from("accounting_counterparties")
          .select("id")
          .eq("company_id", companyId)
          .eq("inn", row.counterpartyInn)
          .maybeSingle();
        
        if (cp) {
          counterpartyId = cp.id;
        } else if (row.counterpartyName) {
          const { data: newCp } = await supabase
            .from("accounting_counterparties")
            .insert({
              company_id: companyId,
              name: row.counterpartyName,
              short_name: row.counterpartyName.substring(0, 50),
              inn: row.counterpartyInn,
              is_active: true,
            })
            .select("id")
            .single();
          
          if (newCp) {
            counterpartyId = newCp.id;
          }
        }
      }
      
      // Создаём операцию
      const amount = row.credit > 0 ? row.credit : -row.debit;
      const direction = row.credit > 0 ? "incoming" : "outgoing";
      
      const { error } = await supabase
        .from("bank_operations")
        .insert({
          company_id: companyId,
          account_id: accountId,
          operation_date: row.date,
          document_number: row.documentNumber,
          counterparty_id: counterpartyId,
          counterparty_name: row.counterpartyName,
          counterparty_inn: row.counterpartyInn,
          amount: Math.abs(amount) * 100, // В копейках
          direction,
          purpose: row.purpose,
          status: "imported",
        });
      
      if (error) {
        result.errors.push(`Строка ${row.date}: ${error.message}`);
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push(`Строка ${row.date}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  result.success = result.errors.length === 0;
  return result;
}

// ============================================
// Вспомогательные функции
// ============================================

function parseDate1C(value: string): string {
  // Формат 1С: DD.MM.YYYY
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return value;
}

function parseDate(value: string): string | null {
  if (!value) return null;
  
  // Пробуем разные форматы
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];
  
  for (const fmt of formats) {
    const match = value.match(fmt);
    if (match) {
      if (fmt === formats[0]) {
        return value;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }
  
  return null;
}

function parseAmount(value: string): number {
  if (!value) return 0;
  // Убираем пробелы, заменяем запятую на точку
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100); // В копейках
}

function findColumn(headers: string[], variants: string[]): number {
  for (const variant of variants) {
    const idx = headers.findIndex(h => h.includes(variant));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// ============================================
// Автоопределение формата файла
// ============================================

export async function detectAndParseBankStatement(
  content: string,
  filename: string
): Promise<ParsedBankStatement> {
  const lowerName = filename.toLowerCase();
  
  // По расширению
  if (lowerName.endsWith(".txt")) {
    // Проверяем, похоже ли на формат 1С
    if (content.includes("СекцияДокумент") || content.includes("1CClientBankExchange")) {
      return parseBankStatement1C(content);
    }
  }
  
  // CSV
  if (lowerName.endsWith(".csv")) {
    // Определяем разделитель
    const firstLine = content.split("\n")[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";
    return parseBankStatementCSV(content, delimiter);
  }
  
  // Пробуем автоопределение по содержимому
  if (content.includes("СекцияДокумент") || content.includes("=")) {
    return parseBankStatement1C(content);
  }
  
  // По умолчанию CSV с ;
  return parseBankStatementCSV(content, ";");
}
