import {
  REQUIRED_HEADERS,
  ALL_ACCEPTED_HEADERS,
  type CsvRowInput,
  type CsvRowValidationResult,
  type CsvNormalizedRow,
  validateCsvRows,
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
  return rows.map((raw, index) => ({
    rowNumber: headerOffset + index,
    raw,
  }));
}

export function validateCsvRecords(records: Record<string, string>[], headerOffset = 2): CsvValidationSummary {
  const inputs = buildCsvRowInputs(records, headerOffset);
  return validateCsvRows(inputs);
}
