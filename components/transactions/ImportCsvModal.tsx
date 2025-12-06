"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa, { type ParseResult } from "papaparse";
import { cn } from "@/lib/utils";
import { type CsvNormalizedRow, type CsvRowValidationResult } from "@/lib/csv/import-schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Импорт транзакций из CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <p className="text-sm text-muted-foreground">
              Загрузите CSV-файл с транзакциями. Поддерживаются разделители `;` или `,`, обязательные колонки:
              «Дата», «Тип», «Сумма». Валюта по умолчанию — RUB.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/transactions/template" download="transactions_template.csv">
                <Download className="h-4 w-4 mr-1" />
                Шаблон
              </a>
            </Button>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragState === "dragover" ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">{parseState.fileName ?? "Перетащите CSV-файл"}</div>
            <div className="text-sm text-muted-foreground">или нажмите для выбора</div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          </div>

          {(parsing || parseState.fileName) && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {parsing ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Чтение CSV…</span> : parseState.rowCount > 0 ? `Обнаружено строк: ${parseState.rowCount}` : "Файл не содержит данных"}
              </div>
              {parseState.summary && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Готовы: {summaryStats.success}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Ошибки: {summaryStats.failed}</span>
                </div>
              )}
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Предварительный просмотр (первые {previewRows.length} строк)</div>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead>Счёт</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Контрагент</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell>{row.occurredAt}</TableCell>
                        <TableCell>{row.direction}</TableCell>
                        <TableCell className="text-right">{(row.amountMinor / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{row.accountName ?? "—"}</TableCell>
                        <TableCell>{row.categoryName ?? "—"}</TableCell>
                        <TableCell>{row.counterparty ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {(parseState.parseErrors.length > 0 || parseState.summary?.errors.length) && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />Ошибки</div>
              <div className="space-y-1 max-h-32 overflow-y-auto text-sm">
                {parseState.parseErrors.map((error, index) => (
                  <div key={`parse-${index + 1}`} className="text-destructive">{error}</div>
                ))}
                {parseState.summary?.errors.map((error: CsvRowValidationResult) => (
                  <div key={`row-${error.rowNumber}`} className="text-destructive">Строка {error.rowNumber}: {error.issues.join(", ")}</div>
                ))}
              </div>
            </div>
          )}

          {infoMessage && <div className="text-sm text-muted-foreground">{infoMessage}</div>}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-xs text-muted-foreground flex-1">
            <div>Файл: {parseState.fileName ?? "не выбран"}</div>
            <div>Будут добавлены только корректные строки</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => resetFile()} disabled={parsing}>Очистить</Button>
            <Button onClick={handleImport} disabled={!canImport || !onImport || hasValidationErrors || parsing || importing}>
              {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Импортируем…</> : `Импортировать ${summaryStats.success}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
