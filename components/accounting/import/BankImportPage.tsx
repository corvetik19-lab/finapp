"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { 
  detectAndParseBankStatement, 
  importBankStatement,
  type ParsedBankStatement,
} from "@/lib/accounting/import/bank-statement";

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function BankImportPage() {
  const { show } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statement, setStatement] = useState<ParsedBankStatement | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [createCounterparties, setCreateCounterparties] = useState(true);
  
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStatement(null);
    setImportResult(null);
    setSelectedRows(new Set());
    setParsing(true);
    
    try {
      const content = await selectedFile.text();
      const parsed = await detectAndParseBankStatement(content, selectedFile.name);
      
      setStatement(parsed);
      // Выбираем все строки по умолчанию
      setSelectedRows(new Set(parsed.rows.map((_, i) => i)));
      
      if (parsed.rows.length === 0) {
        show("Не удалось распознать операции в файле", { type: "info" });
      } else {
        show(`Распознано ${parsed.rows.length} операций`, { type: "success" });
      }
    } catch (error) {
      show("Ошибка при чтении файла", { type: "error" });
      console.error(error);
    } finally {
      setParsing(false);
    }
  }, [show]);

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === statement?.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(statement?.rows.map((_, i) => i) || []));
    }
  };

  const handleImport = async () => {
    if (!statement || selectedRows.size === 0) {
      show("Выберите операции для импорта", { type: "info" });
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    
    try {
      // Фильтруем только выбранные строки
      const filteredStatement: ParsedBankStatement = {
        ...statement,
        rows: statement.rows.filter((_, i) => selectedRows.has(i)),
      };
      
      // TODO: Получить accountId из выбора пользователя
      const accountId = ""; // Временно пустой
      
      const result = await importBankStatement(filteredStatement, accountId, {
        skipDuplicates,
        createCounterparties,
      });
      
      setImportResult(result);
      
      if (result.success) {
        show(`Импортировано ${result.imported} операций`, { type: "success" });
      } else {
        show(`Импортировано ${result.imported}, ошибок: ${result.errors.length}`, { type: "info" });
      }
    } catch (error) {
      show("Ошибка при импорте", { type: "error" });
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setStatement(null);
    setImportResult(null);
    setSelectedRows(new Set());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tenders/accounting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7 text-primary" />
            Импорт банковской выписки
          </h1>
          <p className="text-muted-foreground">
            Загрузите выписку в формате 1С (txt) или CSV
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Загрузка файла */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Файл выписки</CardTitle>
            <CardDescription>
              Поддерживаются форматы 1С (.txt) и CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Нажмите для выбора файла
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.csv"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {parsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Чтение файла...
              </div>
            )}

            {/* Опции импорта */}
            {statement && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(v) => setSkipDuplicates(!!v)}
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm">
                    Пропускать дубликаты
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createCounterparties"
                    checked={createCounterparties}
                    onCheckedChange={(v) => setCreateCounterparties(!!v)}
                  />
                  <Label htmlFor="createCounterparties" className="text-sm">
                    Создавать контрагентов
                  </Label>
                </div>
              </div>
            )}

            {/* Кнопка импорта */}
            {statement && statement.rows.length > 0 && (
              <Button
                onClick={handleImport}
                disabled={importing || selectedRows.size === 0}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Импорт...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Импортировать ({selectedRows.size})
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Результат и превью */}
        <div className="md:col-span-2 space-y-6">
          {/* Результат импорта */}
          {importResult && (
            <Card className={importResult.errors.length > 0 ? "border-orange-200" : "border-green-200"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {importResult.errors.length > 0 ? (
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {importResult.errors.length > 0 ? "Импорт завершён с предупреждениями" : "Импорт успешно завершён"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Импортировано: {importResult.imported}, пропущено: {importResult.skipped}
                      {importResult.errors.length > 0 && `, ошибок: ${importResult.errors.length}`}
                    </p>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 rounded text-sm">
                    <p className="font-medium text-orange-800 mb-1">Ошибки:</p>
                    <ul className="list-disc list-inside text-orange-700 space-y-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...и ещё {importResult.errors.length - 5}</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Сводка */}
          {statement && (
            <Card>
              <CardHeader>
                <CardTitle>Сводка по выписке</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Операций</p>
                    <p className="text-2xl font-bold">{statement.rows.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Поступления</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMoney(statement.totalCredit)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">Списания</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatMoney(statement.totalDebit)}
                    </p>
                  </div>
                </div>
                
                {statement.accountNumber && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Счёт: {statement.accountNumber}
                    {statement.periodStart && statement.periodEnd && (
                      <> • Период: {formatDate(statement.periodStart)} — {formatDate(statement.periodEnd)}</>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Таблица операций */}
          {statement && statement.rows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Операции для импорта</CardTitle>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedRows.size === statement.rows.length ? "Снять выделение" : "Выбрать все"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Контрагент</TableHead>
                        <TableHead className="max-w-[300px]">Назначение</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.rows.map((row, idx) => (
                        <TableRow
                          key={idx}
                          className={selectedRows.has(idx) ? "" : "opacity-50"}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(idx)}
                              onCheckedChange={() => toggleRow(idx)}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(row.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">
                                {row.counterpartyName || "—"}
                              </p>
                              {row.counterpartyInn && (
                                <p className="text-xs text-muted-foreground">
                                  ИНН: {row.counterpartyInn}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="truncate text-sm" title={row.purpose}>
                              {row.purpose || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {row.credit > 0 ? (
                              <Badge variant="outline" className="text-green-600 gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                {formatMoney(row.credit)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 gap-1">
                                <ArrowDownRight className="h-3 w-3" />
                                {formatMoney(row.debit)}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Пустое состояние */}
          {!statement && !parsing && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Загрузите файл выписки для просмотра</p>
                  <p className="text-sm mt-2">
                    Поддерживаются форматы выгрузки из 1С и CSV
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
