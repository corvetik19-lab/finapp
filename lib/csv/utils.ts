import {
  REQUIRED_HEADERS,
  ALL_ACCEPTED_HEADERS,
  type CsvRowInput,
  type CsvRowValidationResult,
  type CsvNormalizedRow,
  validateCsvRow,
} from "@/lib/csv/import-schema";

export type HeaderCheckResult = {
  ok: boolean;
  missing: string[];
  unexpected: string[];
};

export type CsvValidationSummary = {
  normalized: CsvNormalizedRow[];
  errors: CsvRowValidationResult[];
};

const HEADER_NORMALIZE_REGEX = /[\s\u00A0]+/g;

export function normalizeHeader(header: string): string {
  return header.replace(HEADER_NORMALIZE_REGEX, " ").trim();
}

export function checkHeaders(headers: string[]): HeaderCheckResult {
  const normalizedHeaders = headers.map(normalizeHeader);
  const missing = Object.values(REQUIRED_HEADERS).filter((required) => !normalizedHeaders.includes(required));
  const unexpected = normalizedHeaders.filter((header) => !ALL_ACCEPTED_HEADERS.includes(header as typeof ALL_ACCEPTED_HEADERS[number]));
  return {
    ok: missing.length === 0,
    missing,
    unexpected,
  };
}

export function buildCsvRowInputs(rows: Record<string, string>[], headerOffset = 2): CsvRowInput[] {
  return rows
    .map((raw, index) => {
      // Игнорируем строки-комментарии (начинающиеся с #)
      const firstValue = Object.values(raw)[0] || "";
      if (firstValue.trim().startsWith("#")) {
        return null;
      }
      
      // Игнорируем пустые строки
      const hasData = Object.values(raw).some(v => v && v.trim());
      if (!hasData) {
        return null;
      }

      return {
        rowNumber: headerOffset + index,
        raw,
      };
    })
    .filter((input): input is CsvRowInput => input !== null);
}

export function validateCsvRecords(records: Record<string, string>[], headerOffset = 2): CsvValidationSummary {
  const inputs = buildCsvRowInputs(records, headerOffset);
  
  const normalized: CsvNormalizedRow[] = [];
  const errors: CsvRowValidationResult[] = [];

  for (const input of inputs) {
    const result = validateCsvRow(input);
    if (result.issues.length > 0 || !result.normalized) {
      errors.push(result);
    } else {
      normalized.push(result.normalized);
    }
  }

  return { normalized, errors };
}
