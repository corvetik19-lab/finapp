"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import type { ReportData } from "@/lib/reports/types";
import { getCategoryColor, formatCurrency } from "@/lib/reports/utils";
import { Button } from "@/components/ui/button";
import { FileText, Table, Trash2, BarChart3 } from "lucide-react";

Chart.register(...registerables);

type ReportChartProps = {
  data: ReportData | null;
  type?: "bar" | "pie" | "line";
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onClear?: () => void;
};

export default function ReportChart({
  data,
  type = "bar",
  onExportPDF,
  onExportExcel,
  onClear,
}: ReportChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    // Уничтожаем предыдущий график
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Данные для графика
    const chartData = prepareChartData(data, type);

    // Создаём новый график
    // Chart.js типы сложные для динамического type - используем приведение
    const config = {
      type,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom" as const,
          },
          tooltip: {
            callbacks: {
              label: function (context: { label?: string; parsed: { y: number | null } }) {
                let label = context.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y);
                }
                return label;
              },
            },
          },
        },
        scales:
          type === "bar" || type === "line"
            ? {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function (value: string | number) {
                      return formatCurrency(Number(value));
                    },
                  },
                },
              }
            : undefined,
      },
    };
    // Chart.js требует специфической типизации для динамического type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef.current = new Chart(ctx, config as any);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, type]);

  const prepareChartData = (reportData: ReportData, chartType: string) => {
    if (chartType === "pie") {
      // Круговая диаграмма - по категориям
      return {
        labels: reportData.byCategory.map((c) => c.categoryName),
        datasets: [
          {
            label: "Сумма по категориям",
            data: reportData.byCategory.map((c) => c.amount),
            backgroundColor: reportData.byCategory.map((c) =>
              getCategoryColor(c.categoryName)
            ),
          },
        ],
      };
    }

    if (chartType === "line") {
      // Линейный график - динамика по времени
      return {
        labels: reportData.timeline.map((t) => t.date),
        datasets: [
          {
            label: "Доходы",
            data: reportData.timeline.map((t) => t.income),
            borderColor: "#43a047",
            backgroundColor: "rgba(67, 160, 71, 0.1)",
            tension: 0.4,
          },
          {
            label: "Расходы",
            data: reportData.timeline.map((t) => t.expense),
            borderColor: "#e53935",
            backgroundColor: "rgba(229, 57, 53, 0.1)",
            tension: 0.4,
          },
        ],
      };
    }

    // Bar chart - доходы и расходы отдельно
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    const labels: string[] = [];
    
    // Группируем транзакции по категориям
    const categoryGroups = new Map<string, { income: number; expense: number }>();
    
    reportData.transactions.forEach(t => {
      const catKey = t.category || "Без категории";
      if (!categoryGroups.has(catKey)) {
        categoryGroups.set(catKey, { income: 0, expense: 0 });
      }
      const group = categoryGroups.get(catKey)!;
      if (t.direction === "income") {
        group.income += t.amount;
      } else if (t.direction === "expense") {
        group.expense += t.amount;
      }
    });
    
    // Преобразуем в массивы для графика
    categoryGroups.forEach((value, category) => {
      labels.push(category);
      incomeData.push(value.income);
      expenseData.push(value.expense);
    });
    
    return {
      labels,
      datasets: [
        {
          label: "Доходы",
          data: incomeData,
          backgroundColor: "rgba(76, 175, 80, 0.8)", // Зелёный
          borderColor: "rgb(76, 175, 80)",
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Расходы",
          data: expenseData,
          backgroundColor: "rgba(244, 67, 54, 0.8)", // Красный
          borderColor: "rgb(244, 67, 54)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Предпросмотр отчета</h3>
        <div className="flex gap-2">
          {onExportPDF && (
            <Button size="sm" variant="outline" onClick={onExportPDF}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          )}
          {onExportExcel && (
            <Button size="sm" variant="outline" onClick={onExportExcel}>
              <Table className="h-4 w-4 mr-1" />
              Excel
            </Button>
          )}
          {onClear && (
            <Button size="sm" variant="outline" onClick={onClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>
      </div>

      <div className="h-80">
        {!data ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4" />
            <p>Сформируйте отчёт для отображения графика</p>
          </div>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}
