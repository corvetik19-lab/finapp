"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Download,
  FileCode,
  FileText,
  Users,
  BookOpen,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { exportTo1C } from "@/lib/accounting/export/1c-export";

export function Export1CPage() {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  
  const [startDate, setStartDate] = useState(firstDayOfYear.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [includeCounterparties, setIncludeCounterparties] = useState(true);
  const [includeKudir, setIncludeKudir] = useState(true);
  
  const [result, setResult] = useState<{
    success: boolean;
    stats?: { documents: number; counterparties: number; kudirEntries: number };
  } | null>(null);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      show("Укажите период для экспорта", { type: "error" });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const exportResult = await exportTo1C({
        startDate,
        endDate,
        includeDocuments,
        includeCounterparties,
        includeKudir,
      });
      
      if (!exportResult.success) {
        show(exportResult.error || "Ошибка экспорта", { type: "error" });
        return;
      }
      
      setResult({
        success: true,
        stats: exportResult.stats,
      });
      
      // Скачиваем файл
      if (exportResult.xml) {
        const blob = new Blob([exportResult.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportResult.filename || "export_1c.xml";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        show("Файл успешно сформирован", { type: "success" });
      }
    } catch (error) {
      show("Ошибка при экспорте", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
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
            <FileCode className="h-7 w-7 text-primary" />
            Экспорт в 1С
          </h1>
          <p className="text-muted-foreground">
            Выгрузка данных в формате XML для 1С:Бухгалтерия
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Настройки экспорта */}
        <Card>
          <CardHeader>
            <CardTitle>Параметры экспорта</CardTitle>
            <CardDescription>
              Выберите период и данные для выгрузки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Период */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата начала</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата окончания</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Быстрый выбор периода */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
                  setEndDate(now.toISOString().split("T")[0]);
                }}
              >
                Текущий месяц
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const q = Math.floor(now.getMonth() / 3);
                  setStartDate(new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0]);
                  setEndDate(new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().split("T")[0]);
                }}
              >
                Текущий квартал
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]);
                  setEndDate(now.toISOString().split("T")[0]);
                }}
              >
                Текущий год
              </Button>
            </div>

            {/* Что экспортировать */}
            <div className="space-y-4">
              <Label className="text-base">Данные для выгрузки</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="documents"
                    checked={includeDocuments}
                    onCheckedChange={(v) => setIncludeDocuments(!!v)}
                  />
                  <label htmlFor="documents" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Документы</div>
                      <div className="text-xs text-muted-foreground">
                        Счета, акты, накладные, УПД
                      </div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="counterparties"
                    checked={includeCounterparties}
                    onCheckedChange={(v) => setIncludeCounterparties(!!v)}
                  />
                  <label htmlFor="counterparties" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Контрагенты</div>
                      <div className="text-xs text-muted-foreground">
                        Справочник контрагентов
                      </div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="kudir"
                    checked={includeKudir}
                    onCheckedChange={(v) => setIncludeKudir(!!v)}
                  />
                  <label htmlFor="kudir" className="flex items-center gap-2 cursor-pointer">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">КУДиР</div>
                      <div className="text-xs text-muted-foreground">
                        Книга учёта доходов и расходов
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Кнопка экспорта */}
            <Button 
              onClick={handleExport} 
              disabled={loading || (!includeDocuments && !includeCounterparties && !includeKudir)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Формирование файла...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать XML
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результат и информация */}
        <div className="space-y-6">
          {/* Результат экспорта */}
          {result?.success && result.stats && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Экспорт выполнен
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Документов:</span>
                    <span className="font-medium">{result.stats.documents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Контрагентов:</span>
                    <span className="font-medium">{result.stats.counterparties}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Записей КУДиР:</span>
                    <span className="font-medium">{result.stats.kudirEntries}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Информация о формате */}
          <Card>
            <CardHeader>
              <CardTitle>О формате выгрузки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Файл формируется в формате XML, совместимом с механизмом обмена данными 1С:Предприятие.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium">Поддерживаемые версии 1С:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 1С:Бухгалтерия 3.0</li>
                  <li>• 1С:Управление торговлей 11</li>
                  <li>• 1С:ERP Управление предприятием</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Инструкция по загрузке:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Откройте 1С:Бухгалтерию</li>
                  <li>Перейдите в раздел «Администрирование» → «Обмен данными»</li>
                  <li>Выберите «Загрузить данные из файла»</li>
                  <li>Укажите скачанный XML-файл</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
