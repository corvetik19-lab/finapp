"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  History,
} from "lucide-react";
import { SupplierCategory } from "@/lib/suppliers/types";
import {
  SupplierImport,
  ImportPreview,
  ColumnMapping,
  ImportOptions,
  ParsedRow,
  createImportSession,
  parseCSV,
  executeImport,
  downloadImportTemplate,
} from "@/lib/suppliers/import-service";

interface SupplierImportPageProps {
  categories: SupplierCategory[];
  importHistory: SupplierImport[];
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

const SUPPLIER_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: "name", label: "Название компании", required: true },
  { key: "short_name", label: "Краткое название" },
  { key: "inn", label: "ИНН" },
  { key: "kpp", label: "КПП" },
  { key: "ogrn", label: "ОГРН" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "Email" },
  { key: "website", label: "Сайт" },
  { key: "legal_address", label: "Юридический адрес" },
  { key: "actual_address", label: "Фактический адрес" },
  { key: "category", label: "Категория" },
  { key: "status", label: "Статус" },
  { key: "rating", label: "Рейтинг" },
  { key: "tags", label: "Теги" },
  { key: "description", label: "Описание" },
];

export function SupplierImportPage({ categories, importHistory }: SupplierImportPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    updateExisting: false,
    skipDuplicates: true,
    defaultStatus: "active",
  });
  const [, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ successCount: number; errorCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);

    try {
      const content = await readFileContent(selectedFile);
      setFileContent(content);

      // Парсим для получения колонок
      const { preview: previewData } = await parseCSV(content, {}, options);
      setColumns(previewData.columns);
      setMapping(previewData.suggestedMapping);
      setStep("mapping");
    } catch (err) {
      setError("Ошибка чтения файла. Проверьте формат и кодировку.");
      console.error(err);
    }
  }, [options]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const input = document.createElement("input");
    input.type = "file";
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(droppedFile);
    input.files = dataTransfer.files;

    handleFileSelect({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
  }, [handleFileSelect]);

  const handleMappingChange = (field: keyof ColumnMapping, column: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: column === "none" ? undefined : column,
    }));
  };

  const handlePreview = async () => {
    setError(null);
    try {
      const { rows, preview: previewData } = await parseCSV(fileContent, mapping, options);
      setPreview(previewData);
      setParsedRows(rows);
      setStep("preview");
    } catch (err) {
      setError("Ошибка парсинга данных");
      console.error(err);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setStep("importing");
    setProgress(0);
    setError(null);

    try {
      const session = await createImportSession(file?.name || "import.csv", file?.size);
      if (!session) {
        throw new Error("Не удалось создать сессию импорта");
      }

      // Симулируем прогресс
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      const importResult = await executeImport(
        session.id,
        parsedRows,
        mapping,
        options,
        categories
      );

      clearInterval(progressInterval);
      setProgress(100);

      setResult({
        successCount: importResult.successCount,
        errorCount: importResult.errorCount,
      });
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const csv = await downloadImportTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suppliers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setFileContent("");
    setColumns([]);
    setMapping({});
    setPreview(null);
    setParsedRows([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Импорт поставщиков</h1>
          <p className="text-muted-foreground">
            Загрузите базу поставщиков из CSV или Excel файла
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/tenders/suppliers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          К списку
        </Button>
      </div>

      {/* Шаги */}
      <div className="flex items-center gap-2">
        {["upload", "mapping", "preview", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "mapping", "preview", "complete"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
          </div>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Загрузка файла
              </CardTitle>
              <CardDescription>
                Поддерживаются форматы CSV и XLSX (до 100 МБ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Перетащите файл сюда
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  или нажмите для выбора
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="secondary">Выбрать файл</Button>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать шаблон CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История импортов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Нет предыдущих импортов
                </p>
              ) : (
                <div className="space-y-3">
                  {importHistory.map((imp) => (
                    <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{imp.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(imp.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={imp.status === "completed" ? "default" : imp.status === "failed" ? "destructive" : "secondary"}>
                          {imp.status === "completed" ? `${imp.success_count} добавлено` : imp.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Сопоставление колонок</CardTitle>
            <CardDescription>
              Укажите соответствие колонок файла полям поставщика
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SUPPLIER_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={mapping[key] || "none"}
                    onValueChange={(value) => handleMappingChange(key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите колонку" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Не выбрано —</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Параметры импорта</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={options.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, skipDuplicates: !!checked }))
                    }
                  />
                  <Label htmlFor="skip-duplicates">Пропускать дубликаты (по ИНН)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="update-existing"
                    checked={options.updateExisting}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, updateExisting: !!checked }))
                    }
                  />
                  <Label htmlFor="update-existing">Обновлять существующие записи</Label>
                </div>
                <div className="flex items-center gap-4">
                  <Label>Категория по умолчанию:</Label>
                  <Select
                    value={options.defaultCategory || "none"}
                    onValueChange={(value) =>
                      setOptions((prev) => ({
                        ...prev,
                        defaultCategory: value === "none" ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Не выбрана" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Не выбрана —</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={handlePreview} disabled={!mapping.name}>
                Предпросмотр
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Предпросмотр импорта</CardTitle>
            <CardDescription>
              Проверьте данные перед импортом
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold">{preview.totalRows}</p>
                <p className="text-sm text-muted-foreground">Всего строк</p>
              </div>
              <div className="p-4 border rounded-lg text-center border-green-200 bg-green-50">
                <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
                <p className="text-sm text-green-600">Валидных</p>
              </div>
              <div className="p-4 border rounded-lg text-center border-yellow-200 bg-yellow-50">
                <p className="text-2xl font-bold text-yellow-600">{preview.duplicateRows}</p>
                <p className="text-sm text-yellow-600">Дубликатов</p>
              </div>
              <div className="p-4 border rounded-lg text-center border-red-200 bg-red-50">
                <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
                <p className="text-sm text-red-600">С ошибками</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">№</TableHead>
                    <TableHead className="w-16">Статус</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>ИНН</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleRows.map((row) => (
                    <TableRow key={row.rowNumber} className={!row.isValid ? "bg-red-50" : row.isDuplicate ? "bg-yellow-50" : ""}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          row.isDuplicate ? (
                            <Badge variant="outline" className="text-yellow-600">Дубликат</Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{mapping.name ? row.data[mapping.name] : "—"}</TableCell>
                      <TableCell>{mapping.inn ? row.data[mapping.inn] : "—"}</TableCell>
                      <TableCell>{mapping.phone ? row.data[mapping.phone] : "—"}</TableCell>
                      <TableCell>{mapping.email ? row.data[mapping.email] : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {preview.sampleRows.length < preview.totalRows && (
              <p className="text-center text-sm text-muted-foreground">
                Показаны первые 5 записей из {preview.totalRows}
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={handleImport} disabled={preview.validRows === 0}>
                Импортировать {preview.validRows} записей
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <h3 className="text-xl font-semibold">Импорт данных...</h3>
              <p className="text-muted-foreground">
                Пожалуйста, не закрывайте страницу
              </p>
              <div className="max-w-md mx-auto">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === "complete" && result && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold">Импорт завершён!</h3>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-3xl font-bold text-green-600">{result.successCount}</p>
                  <p className="text-sm text-muted-foreground">Добавлено</p>
                </div>
                {result.errorCount > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-red-600">{result.errorCount}</p>
                    <p className="text-sm text-muted-foreground">Ошибок</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Новый импорт
                </Button>
                <Button onClick={() => router.push("/tenders/suppliers")}>
                  К списку поставщиков
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}
