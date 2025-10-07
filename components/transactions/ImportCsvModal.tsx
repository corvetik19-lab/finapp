"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa, { type ParseResult } from "papaparse";
import clsx from "clsx";
import styles from "./ImportCsvModal.module.css";
import {
  type CsvNormalizedRow,
  type CsvRowValidationResult,
} from "@/lib/csv/import-schema";
import {
  checkHeaders,
  normalizeHeader,
  type HeaderCheckResult,
  type CsvValidationSummary,
  validateCsvRecords,
} from "@/lib/csv/utils";

const PREVIEW_LIMIT = 8;

type ImportHandlerResult = {
  ok: boolean;
  message?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImport?: (payload: { rows: CsvNormalizedRow[]; fileName: string }) => Promise<ImportHandlerResult> | ImportHandlerResult;
};

type ParseState = {
  fileName: string | null;
  headerCheck: HeaderCheckResult | null;
  summary: CsvValidationSummary | null;
  parseErrors: string[];
  rowCount: number;
};

type DragState = "idle" | "dragover";

const initialParseState: ParseState = {
  fileName: null,
  headerCheck: null,
  summary: null,
  parseErrors: [],
  rowCount: 0,
};

function normalizeRecords(records: Papa.ParseResult<Record<string, unknown>>["data"]): Record<string, string>[] {
  return (records as Record<string, unknown>[]).map((row) => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key) continue;
      if (typeof value === "string") {
        result[key] = value;
      } else if (value === null || value === undefined) {
        result[key] = "";
      } else {
        result[key] = String(value);
      }
    }
    return result;
  });
}

export default function ImportCsvModal({ open, onClose, onImport }: Props) {
  const [parseState, setParseState] = useState<ParseState>(initialParseState);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragState, setDragState] = useState<DragState>("idle");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setParseState(initialParseState);
      setParsing(false);
      setImporting(false);
      setDragState("idle");
      setInfoMessage(null);
    }
  }, [open]);

  const resetFile = useCallback((options?: { clearMessage?: boolean }) => {
    setParseState(initialParseState);
    if (options?.clearMessage !== false) {
      setInfoMessage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleParseError = useCallback((message: string) => {
    setParseState((prev) => ({
      ...prev,
      summary: null,
      parseErrors: [message],
    }));
  }, []);

  const processFile = useCallback((file: File) => {
    setParsing(true);
    setInfoMessage(null);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: (results: ParseResult<Record<string, unknown>>) => {
        setParsing(false);
        const parseErrors: string[] = [];

        if (results.errors?.length) {
          for (const err of results.errors) {
            parseErrors.push(`Ошибка CSV (${err.code ?? ""}): ${err.message} (строка ${err.row ?? "?"})`);
          }
        }

        const headers = results.meta.fields ?? [];
        const headerCheck = checkHeaders(headers);

        if (!headerCheck.ok) {
          const messages: string[] = [];
          if (headerCheck.missing.length > 0) {
            messages.push(`Отсутствуют обязательные колонки: ${headerCheck.missing.join(", ")}`);
          }
          if (headerCheck.unexpected.length > 0) {
            messages.push(`Неизвестные колонки: ${headerCheck.unexpected.join(", ")}`);
          }
          setParseState({
            fileName: file.name,
            headerCheck,
            summary: null,
            parseErrors: [...parseErrors, ...messages],
            rowCount: 0,
          });
          return;
        }

        const normalizedRecords = normalizeRecords(results.data);
        const summary = validateCsvRecords(normalizedRecords, 2);

        setParseState({
          fileName: file.name,
          headerCheck,
          summary,
          parseErrors,
          rowCount: normalizedRecords.length,
        });
      },
      error: (error: Error) => {
        setParsing(false);
        const message = error?.message ? `Не удалось прочитать CSV: ${error.message}` : "Не удалось прочитать CSV";
        handleParseError(message);
      },
    });
  }, [handleParseError]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".csv")) {
      handleParseError("Поддерживаются только файлы .csv");
      return;
    }
    processFile(file);
  }, [handleParseError, processFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragState("idle");
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragState !== "dragover") setDragState("dragover");
  }, [dragState]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragState("idle");
  }, []);

  const summaryStats = useMemo(() => {
    if (!parseState.summary) {
      return { success: 0, failed: 0 };
    }
    return {
      success: parseState.summary.normalized.length,
      failed: parseState.summary.errors.length,
    };
  }, [parseState.summary]);

  const previewRows = useMemo(() => {
    if (!parseState.summary) return [];
    return parseState.summary.normalized.slice(0, PREVIEW_LIMIT);
  }, [parseState.summary]);

  const hasValidationErrors = parseState.parseErrors.length > 0 || summaryStats.failed > 0;
  const canImport = Boolean(parseState.summary && summaryStats.success > 0 && !parsing && !importing);

  const handleImport = useCallback(async () => {
    if (!onImport || !parseState.summary || !parseState.fileName) return;
    try {
      setImporting(true);
      setInfoMessage(null);
      const result = await onImport({ rows: parseState.summary.normalized, fileName: parseState.fileName });
      resetFile({ clearMessage: false });
      setInfoMessage(result?.message ?? null);
      if (result?.ok) {
        onClose();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Не удалось выполнить импорт";
      setInfoMessage(msg);
    } finally {
      setImporting(false);
    }
  }, [onImport, parseState.summary, parseState.fileName, resetFile, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal
        aria-labelledby="csv-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title} id="csv-import-title">Импорт транзакций из CSV</div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
              <p className={styles.helperText} style={{ margin: 0 }}>
                Загрузите CSV-файл с транзакциями. Поддерживаются разделители `;` или `,`, обязательные колонки:
                «Дата», «Тип», «Сумма». Валюта по умолчанию — RUB.
              </p>
              <a
                href="/api/transactions/template"
                download="transactions_template.csv"
                className={styles.secondaryButton}
                style={{ 
                  textDecoration: "none", 
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                <span className="material-icons" style={{ fontSize: "18px" }}>download</span>
                Скачать шаблон
              </a>
            </div>
            <div
              className={clsx(styles.dropZone, dragState === "dragover" && styles.dragOver)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
            >
              <strong>{parseState.fileName ?? "Перетащите CSV-файл"}</strong>
              <div>или <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}> выберите на компьютере</span></div>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </div>
          </section>

          {(parsing || parseState.fileName) && (
            <section className={styles.section}>
              <div className={styles.helperText}>
                {parsing ? "Чтение CSV…" : parseState.rowCount > 0 ? `Обнаружено строк: ${parseState.rowCount}` : "Файл не содержит данных"}
              </div>
              {parseState.summary && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className={clsx(styles.badge, styles.success)}>Готовы к импорту: {summaryStats.success}</span>
                  <span className={clsx(styles.badge, styles.warning)}>Сообщения об ошибках: {summaryStats.failed}</span>
                </div>
              )}
            </section>
          )}

          {previewRows.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Предварительный просмотр (первые {previewRows.length} строк)</div>
              <div className={styles.previewTableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Дата (UTC)</th>
                      <th>Тип</th>
                      <th>Сумма (₽)</th>
                      <th>Счёт</th>
                      <th>Категория</th>
                      <th>Контрагент</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{row.occurredAt}</td>
                        <td>{row.direction}</td>
                        <td>{(row.amountMinor / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                        <td>{row.accountName ?? "—"}</td>
                        <td>{row.categoryName ?? "—"}</td>
                        <td>{row.counterparty ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(parseState.parseErrors.length > 0 || parseState.summary?.errors.length) && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Ошибки</div>
              <div className={styles.errorList}>
                {parseState.parseErrors.map((error, index) => (
                  <div key={`parse-${index + 1}`} className={styles.errorItem}>{error}</div>
                ))}
                {parseState.summary?.errors.map((error: CsvRowValidationResult) => (
                  <div key={`row-${error.rowNumber}`} className={styles.errorItem}>
                    Строка {error.rowNumber}: {error.issues.join(", ")}
                  </div>
                ))}
              </div>
            </section>
          )}

          {infoMessage && (
            <section className={styles.section}>
              <div className={styles.helperText}>{infoMessage}</div>
            </section>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.leftInfo}>
            <span>Файл: {parseState.fileName ?? "не выбран"}</span>
            <span>Будут добавлены только корректные строки. Ошибочные можно скачать позже (планируется).</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => resetFile()} disabled={parsing}>Очистить</button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleImport}
              disabled={!canImport || !onImport || hasValidationErrors || parsing || importing}
            >
              {importing ? "Импортируем…" : onImport ? `Импортировать ${summaryStats.success}` : "Импорт недоступен"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
