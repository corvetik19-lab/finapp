"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReportBuilder from "@/components/reports/ReportBuilder";
import ReportChart from "@/components/reports/ReportChart";
import ReportsList from "@/components/reports/ReportsList";
import type { ReportBuilderConfig, ReportData, Report } from "@/lib/reports/types";
import { exportToCSV } from "@/lib/reports/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, Loader2 } from "lucide-react";

export default function CustomReportsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ReportBuilderConfig | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: "",
    category: "custom" as const,
    reportType: "table" as const,
    format: "screen" as const,
  });

  // Для сравнения отчётов
  const [comparisonReports, setComparisonReports] = useState<Array<{ name: string; data: ReportData }>>([]);
  useEffect(() => {
    loadSavedReports();
  }, []);

  // Отрисовка графика сравнения
  useEffect(() => {
    if (comparisonReports.length === 0) return;

    const canvas = document.getElementById('comparisonCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Динамический импорт Chart.js
    import('chart.js/auto').then(({ default: Chart }) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Уничтожаем предыдущий график
      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Подготовка данных
      const labels = comparisonReports.map(r => r.name);
      const incomeData = comparisonReports.map(r => r.data.summary.totalIncome);
      const expenseData = comparisonReports.map(r => r.data.summary.totalExpense);
      const balanceData = comparisonReports.map(r => r.data.summary.balance);

      console.log('Comparison Chart Data:', {
        labels,
        incomeData,
        expenseData,
        balanceData,
        reports: comparisonReports.map(r => ({ 
          name: r.name, 
          income: r.data.summary.totalIncome,
          expense: r.data.summary.totalExpense 
        }))
      });

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Доходы',
              data: incomeData,
              backgroundColor: 'rgba(76, 175, 80, 0.7)',
              borderColor: 'rgb(76, 175, 80)',
              borderWidth: 2,
            },
            {
              label: 'Расходы',
              data: expenseData,
              backgroundColor: 'rgba(244, 67, 54, 0.7)',
              borderColor: 'rgb(244, 67, 54)',
              borderWidth: 2,
            },
            {
              label: 'Баланс',
              data: balanceData,
              backgroundColor: 'rgba(33, 150, 243, 0.7)',
              borderColor: 'rgb(33, 150, 243)',
              borderWidth: 2,
              type: 'line',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Сравнение финансовых показателей',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  }).format(context.parsed.y);
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0
                  }).format(value as number);
                }
              }
            }
          }
        }
      });
    });
  }, [comparisonReports]);

  const loadSavedReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (config: ReportBuilderConfig) => {
    setIsGenerating(true);
    setCurrentConfig(config); // Сохраняем конфиг для возможности сохранения отчёта
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: config.period,
          dateFrom: config.dateFrom,
          dateTo: config.dateTo,
          dataTypes: config.dataTypes,
          categories: config.categories,
          accounts: config.accounts,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to generate report");
      }

      const result = await res.json();
      setReportData(result.data);
      setSaveForm(prev => ({ ...prev, name: config.name || "" }));
    } catch (error) {
      console.error("Error generating report:", error);
      alert(`Ошибка при формировании отчёта: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToChart = async () => {
    if (!reportData) {
      alert("Сначала сформируйте отчёт");
      return;
    }
    
    // Создаем уникальное имя с периодом и временной меткой
    const periodLabel = currentConfig?.period === "today" ? "Сегодня" :
                        currentConfig?.period === "week" ? "Текущая неделя" :
                        currentConfig?.period === "month" ? "Текущий месяц" :
                        currentConfig?.period === "quarter" ? "Текущий квартал" :
                        currentConfig?.period === "year" ? "Текущий год" : "Произвольный период";
    
    const reportName = currentConfig?.name && currentConfig.name !== "Без названия" 
      ? currentConfig.name 
      : `${periodLabel} (${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`;
    
    // Создаем глубокую копию данных чтобы избежать мутаций
    const dataCopy = JSON.parse(JSON.stringify(reportData));
    
    // Добавляем отчёт в список для сравнения
    setComparisonReports([...comparisonReports, {
      name: reportName,
      data: dataCopy
    }]);
    
    alert(`Отчёт "${reportName}" добавлен в график сравнения!\n\nДоходы: ${reportData.summary.totalIncome.toFixed(2)} ₽\nРасходы: ${reportData.summary.totalExpense.toFixed(2)} ₽`);
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    // Экспорт транзакций в CSV
    const csvData = reportData.transactions.map(t => ({
      Дата: t.date,
      Описание: t.description,
      Категория: t.category,
      Счёт: t.account,
      Сумма: t.amount,
      Тип: t.direction === "income" ? "Доход" : "Расход",
    }));

    exportToCSV(csvData, `отчёт-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleExportPDF = () => {
    alert("Экспорт в PDF будет доступен в следующей версии");
  };

  const handleClear = () => {
    setReportData(null);
  };

  const handleSaveReport = async () => {
    if (!currentConfig) {
      alert("Сначала сформируйте отчёт");
      return;
    }

    if (!saveForm.name.trim()) {
      alert("Введите название отчёта");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveForm.name,
          category: saveForm.category as "income_expense" | "cash_flow" | "balance" | "budget" | "category" | "custom",
          period: currentConfig.period,
          dateFrom: currentConfig.dateFrom,
          dateTo: currentConfig.dateTo,
          dataTypes: currentConfig.dataTypes,
          categories: currentConfig.categories,
          accounts: currentConfig.accounts,
          reportType: saveForm.reportType as "table" | "chart" | "summary",
          format: saveForm.format as "screen" | "pdf" | "excel" | "csv",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save report");
      }

      alert("Отчёт сохранён!");
      setShowSaveModal(false);
      loadSavedReports();
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Ошибка при сохранении отчёта");
    }
  };

  const handleSelectReport = async (report: Report) => {
    // Загрузить данные выбранного отчёта
    handleGenerate({
      name: report.name,
      period: report.period,
      dateFrom: report.dateFrom || undefined,
      dateTo: report.dateTo || undefined,
      dataTypes: report.dataTypes || ["income", "expense"], // Дефолтные значения если не указано
      categories: report.categories || [],
      accounts: report.accounts || [],
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete report");
      }

      // Обновить список
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Ошибка при удалении отчёта");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пользовательские отчёты</h1>
        <Button variant="outline" onClick={() => router.push("/reports")}><ArrowLeft className="h-4 w-4 mr-1" />К стандартным</Button>
      </div>

      <ReportBuilder
        onGenerate={handleGenerate}
        onAddToChart={handleAddToChart}
        isGenerating={isGenerating}
      />

      <ReportChart
        data={reportData}
        type="bar"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onClear={handleClear}
      />

      {reportData && <Card><CardHeader><CardTitle>Детализация</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Категория</TableHead><TableHead className="text-green-600">Доходы</TableHead><TableHead className="text-red-600">Расходы</TableHead><TableHead>Итого</TableHead></TableRow></TableHeader>
        <TableBody>{Array.from(reportData.transactions.reduce((m, t) => { const k = t.category || 'Без категории'; if (!m.has(k)) m.set(k, { income: 0, expense: 0 }); const g = m.get(k)!; if (t.direction === 'income') g.income += t.amount; else if (t.direction === 'expense') g.expense += t.amount; return m; }, new Map<string, { income: number; expense: number }>())).map(([cat, v]) => <TableRow key={cat}><TableCell className="font-medium">{cat}</TableCell><TableCell className="text-green-600">{v.income > 0 ? `+${v.income.toFixed(2)} ₽` : '—'}</TableCell><TableCell className="text-red-600">{v.expense > 0 ? `-${v.expense.toFixed(2)} ₽` : '—'}</TableCell><TableCell className="font-bold">{(v.income - v.expense).toFixed(2)} ₽</TableCell></TableRow>)}
        <TableRow className="border-t-2"><TableCell className="font-bold">ИТОГО</TableCell><TableCell className="font-bold text-green-600">+{reportData.summary.totalIncome.toFixed(2)} ₽</TableCell><TableCell className="font-bold text-red-600">-{reportData.summary.totalExpense.toFixed(2)} ₽</TableCell><TableCell className={`font-bold ${reportData.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{reportData.summary.balance.toFixed(2)} ₽</TableCell></TableRow></TableBody></Table>
      </CardContent></Card>}

      {reportData && <div className="flex justify-center p-5 bg-muted rounded-lg"><Button onClick={() => setShowSaveModal(true)}><Save className="h-4 w-4 mr-1" />Сохранить отчёт</Button></div>}

      {comparisonReports.length > 0 && <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>График сравнения</CardTitle><Button variant="outline" size="sm" onClick={() => setComparisonReports([])}>Очистить</Button></div></CardHeader><CardContent className="space-y-4">
        <div className="space-y-2">{comparisonReports.map((r, i) => <div key={`${r.name}-${i}`} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><Badge style={{ backgroundColor: `hsl(${i * 60}, 70%, 50%)` }}>{i + 1}</Badge><div><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-muted-foreground"><span className="text-green-600">↑{r.data.summary.totalIncome.toFixed(2)}₽</span> | <span className="text-red-600">↓{r.data.summary.totalExpense.toFixed(2)}₽</span> | <span className={r.data.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}>{r.data.summary.balance.toFixed(2)}₽</span></div></div></div><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setComparisonReports(comparisonReports.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button></div>)}</div>
        <canvas id="comparisonCanvas" style={{ maxHeight: '400px' }} />
      </CardContent></Card>}

      <Card><CardHeader><CardTitle>Сохранённые отчёты</CardTitle></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground mb-4">💡 Кликните на отчёт чтобы применить фильтры</p>
        {isLoading ? <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка...</div> : <ReportsList reports={savedReports} onSelect={handleSelectReport} onDelete={handleDeleteReport} />}
      </CardContent></Card>

      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}><DialogContent><DialogHeader><DialogTitle>Сохранить отчёт</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm bg-muted p-3 rounded"><p className="font-medium mb-2">📌 Сохраняются фильтры:</p><ul className="list-disc list-inside text-muted-foreground space-y-1"><li>Период: <strong>{currentConfig?.period === 'today' ? 'Сегодня' : currentConfig?.period === 'week' ? 'Неделя' : currentConfig?.period === 'month' ? 'Месяц' : currentConfig?.period === 'quarter' ? 'Квартал' : currentConfig?.period === 'year' ? 'Год' : 'Произвольный'}</strong></li><li>Типы: <strong>{currentConfig?.dataTypes.map(t => t === 'income' ? 'Доходы' : t === 'expense' ? 'Расходы' : t).join(', ')}</strong></li></ul></div>
          <div><Label>Название</Label><Input value={saveForm.name} onChange={e => setSaveForm({...saveForm, name: e.target.value})} placeholder="Расходы за октябрь" /></div>
          <div><Label>Категория</Label><select value={saveForm.category} onChange={e => setSaveForm({...saveForm, category: e.target.value as typeof saveForm.category})} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"><option value="custom">Пользовательские</option><option value="income_expense">Доходы/Расходы</option><option value="cash_flow">Денежный поток</option><option value="balance">Баланс</option><option value="budget">Бюджет</option><option value="category">По категориям</option></select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowSaveModal(false)}>Отмена</Button><Button onClick={handleSaveReport}>Сохранить</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
