"use client";

import { useEffect, useRef } from "react";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type ForecastMonth = { month: string; predictedIncome: number; predictedExpenses: number; confidence: number; };
type ForecastData = { nextMonths: ForecastMonth[]; summary: string; };
type Props = { forecast: ForecastData; };

export default function ForecastChart({ forecast }: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !forecast.nextMonths.length) return;

    // Уничтожаем предыдущий график
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = forecast.nextMonths.map(m => m.month);
    const incomeData = forecast.nextMonths.map(m => m.predictedIncome);
    const expensesData = forecast.nextMonths.map(m => m.predictedExpenses);
    const confidenceData = forecast.nextMonths.map(m => m.confidence);

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Прогноз доходов",
            data: incomeData,
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderDash: [5, 5], // Пунктирная линия для прогноза
          },
          {
            label: "Прогноз расходов",
            data: expensesData,
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: {
                size: 13,
                weight: 500,
              },
              padding: 15,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || "";
                const value = context.parsed.y ?? 0;
                const confidence = confidenceData[context.dataIndex];
                return `${label}: ${value.toLocaleString('ru-RU')}₽ (уверенность: ${confidence}%)`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('ru-RU') + '₽';
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [forecast]);

  if (!forecast.nextMonths.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Прогноз на будущее</CardTitle></CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">Недостаточно данных для построения прогноза</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />AI Прогноз на следующие месяцы</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {forecast.summary && <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">{forecast.summary}</p>}
        <div className="h-64"><canvas ref={chartRef}></canvas></div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><span className="w-8 border-t-2 border-dashed border-green-500" /><span className="text-muted-foreground">Пунктирная линия = Прогноз AI</span></div>
          <div className="flex flex-wrap gap-2">{forecast.nextMonths.map((month, i) => (
            <Badge key={i} variant="outline" className={cn(month.confidence >= 80 ? "border-green-500" : month.confidence >= 60 ? "border-yellow-500" : "border-red-500")}>{month.month}: {month.confidence}%</Badge>
          ))}</div>
        </div>
      </CardContent>
    </Card>
  );
}

