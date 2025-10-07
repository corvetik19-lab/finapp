import { z } from "zod";
import type { TransactionDirection } from "@/lib/transactions/service";

export const REQUIRED_HEADERS = {
  occurredAt: "Дата",
  direction: "Тип",
  amountMajor: "Сумма",
} as const;

export const OPTIONAL_HEADERS = {
  externalId: "ID",
  currency: "Валюта",
  accountName: "Счёт",
  categoryName: "Категория",
  counterparty: "Контрагент",
  note: "Заметка",
  tags: "Теги",
} as const;

export const ALL_ACCEPTED_HEADERS = [
  ...Object.values(REQUIRED_HEADERS),
  ...Object.values(OPTIONAL_HEADERS),
] as const;

const directionAliases: Record<string, TransactionDirection> = {
  income: "income",
  доход: "income",
  expense: "expense",
  расход: "expense",
  transfer: "transfer",
  перевод: "transfer",
};

const TAG_SPLIT_REGEX = /[,;|]/;

const csvRowSchema = z.object({
  rowNumber: z.number().int().gt(0),
  raw: z.record(z.string(), z.string()),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

type ParseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  message: string;
};

export type CsvNormalizedRow = {
  rowNumber: number;
  externalId?: string;
  occurredAt: string; // ISO string (UTC)
  direction: TransactionDirection;
  amountMinor: number;
  currency: string;
  accountName?: string;
  categoryName?: string;
  counterparty?: string;
  note?: string;
  tags: string[];
};

export type CsvRowValidationResult = {
  rowNumber: number;
  issues: string[];
  normalized?: CsvNormalizedRow;
};

const ISO_CURRENCY_REGEX = /^[A-Z]{3}$/;

function parseDirection(value: string): ParseResult<TransactionDirection> {
  const normalized = value.trim().toLowerCase();
  const direction = directionAliases[normalized];
  if (!direction) {
    return {
      success: false,
      message: `Неизвестный тип транзакции: "${value}". Ожидается income/expense/transfer.`,
    };
  }
  return { success: true, data: direction };
}

function parseCurrency(value: string): ParseResult<string> {
  const trimmed = value.trim().toUpperCase();
  if (!ISO_CURRENCY_REGEX.test(trimmed)) {
    return {
      success: false,
      message: `Валюта должна быть в формате ISO 4217 (три буквы), получено "${value}"`,
    };
  }
  return { success: true, data: trimmed };
}

function parseDate(value: string): ParseResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, message: "Пустое значение даты" };
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return { success: true, data: direct.toISOString() };
  }

  const dotFormatMatch = trimmed.match(/^([0-3]\d)\.([0-1]\d)\.(\d{4})(?:\s+([0-2]\d):([0-5]\d))?$/);
  if (dotFormatMatch) {
    const [, dd, mm, yyyy, hh = "00", min = "00"] = dotFormatMatch;
    const day = Number.parseInt(dd, 10);
    const monthIndex = Number.parseInt(mm, 10) - 1;
    const year = Number.parseInt(yyyy, 10);
    const hours = Number.parseInt(hh, 10);
    const minutes = Number.parseInt(min, 10);
    const iso = new Date(Date.UTC(year, monthIndex, day, hours, minutes, 0, 0));
    if (!Number.isNaN(iso.getTime())) {
      return { success: true, data: iso.toISOString() };
    }
  }

  return {
    success: false,
    message: `Не удалось распарсить дату "${value}". Используйте ISO 8601 или формат ДД.ММ.ГГГГ (опционально с временем).`,
  };
}

function parseAmount(value: string): ParseResult<number> {
  const cleaned = value.replace(/[\s\u00A0]/g, "").replace(",", ".");
  if (!cleaned) {
    return { success: false, message: "Пустое значение суммы" };
  }
  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) {
    return {
      success: false,
      message: `Некорректная сумма "${value}". Допустимы только числа или десятичные значения.`,
    };
  }
  const amountMinor = Math.round(numeric * 100);
  return { success: true, data: amountMinor };
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(TAG_SPLIT_REGEX)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function pickValue(raw: Record<string, string>, header: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(raw, header) ? raw[header] : undefined;
}

export function validateCsvRow(input: CsvRowInput): CsvRowValidationResult {
  const parsedInput = csvRowSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      rowNumber: input.rowNumber,
      issues: parsedInput.error.issues.map((issue) => issue.message),
    };
  }

  const { rowNumber, raw } = parsedInput.data;
  const issues: string[] = [];

  const occurredAtRaw = pickValue(raw, REQUIRED_HEADERS.occurredAt) ?? "";
  const directionRaw = pickValue(raw, REQUIRED_HEADERS.direction) ?? "";
  const amountRaw = pickValue(raw, REQUIRED_HEADERS.amountMajor) ?? "";
  const currencyRaw = pickValue(raw, OPTIONAL_HEADERS.currency) ?? "RUB"; // По умолчанию RUB

  const dateResult = parseDate(occurredAtRaw);
  const occurredAtISO = dateResult.success ? dateResult.data : undefined;
  if (!dateResult.success) issues.push(dateResult.message);

  const directionResult = parseDirection(directionRaw);
  const direction = directionResult.success ? directionResult.data : undefined;
  if (!directionResult.success) issues.push(directionResult.message);

  const amountResult = parseAmount(amountRaw);
  const amountMinor = amountResult.success ? amountResult.data : undefined;
  if (!amountResult.success) issues.push(amountResult.message);

  // Валюта опциональна, если не указана - используется RUB
  const currencyResult = parseCurrency(currencyRaw);
  const currency = currencyResult.success ? currencyResult.data : "RUB";
  if (!currencyResult.success && currencyRaw !== "RUB") {
    issues.push(currencyResult.message);
  }

  if (issues.length > 0) {
    return { rowNumber, issues };
  }

  const normalized: CsvNormalizedRow = {
    rowNumber,
    externalId: pickValue(raw, OPTIONAL_HEADERS.externalId)?.trim() || undefined,
    occurredAt: occurredAtISO!,
    direction: direction!,
    amountMinor: amountMinor!,
    currency: currency!,
    accountName: pickValue(raw, OPTIONAL_HEADERS.accountName)?.trim() || undefined,
    categoryName: pickValue(raw, OPTIONAL_HEADERS.categoryName)?.trim() || undefined,
    counterparty: pickValue(raw, OPTIONAL_HEADERS.counterparty)?.trim() || undefined,
    note: pickValue(raw, OPTIONAL_HEADERS.note)?.trim() || undefined,
    tags: parseTags(pickValue(raw, OPTIONAL_HEADERS.tags)),
  };

  return { rowNumber, issues, normalized };
}

export function validateCsvRows(rows: CsvRowInput[]): {
  normalized: CsvNormalizedRow[];
  errors: CsvRowValidationResult[];
} {
  const normalized: CsvNormalizedRow[] = [];
  const errors: CsvRowValidationResult[] = [];

  for (const row of rows) {
    const result = validateCsvRow(row);
    if (result.issues.length > 0 || !result.normalized) {
      errors.push(result);
    } else {
      normalized.push(result.normalized);
    }
  }

  return { normalized, errors };
}
