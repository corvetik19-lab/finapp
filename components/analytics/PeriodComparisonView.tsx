"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  type PeriodComparison,
  formatMoney,
  getTrendIcon,
  getTrendColor,
} from "@/lib/analytics/comparison";

export default function PeriodComparisonView() {
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<"month" | "year">("month");

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonType]);

  async function loadComparison() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/comparison?type=${comparisonType}`);
      if (!res.ok) {
        throw new Error("Failed to load comparison");
      }
      const data = await res.json();
      setComparison(data.comparison);
    } catch (err) {
      console.error("Error loading comparison:", err);
      setError("Не удалось загрузить сравнение");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />Анализируем данные...</div>;
  }

  if (error || !comparison) {
    return <div className="flex flex-col items-center justify-center py-12 text-destructive"><AlertCircle className="h-12 w-12 mb-2" /><h2 className="font-bold">Ошибка загрузки</h2><p>{error || "Нет данных"}</p></div>;
  }

  const { metrics, current_period, previous_period, by_category, timeline } = comparison;

  // График временной динамики
  const chartData = {
    labels: timeline.map((t) => t.label),
    datasets: [
      {
        label: "Доходы",
        data: timeline.map((t) => t.income / 100),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
      {
        label: "Расходы",
        data: timeline.map((t) => t.expense / 100),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        tension: 0.4,
      },
      {
        label: "Баланс",
        data: timeline.map((t) => t.balance / 100),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Динамика за последние 12 месяцев",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => `${Number(value).toLocaleString("ru-RU")} ₽`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={comparisonType === "month" ? "default" : "outline"} size="sm" onClick={() => setComparisonType("month")}>Месяц к месяцу</Button>
        <Button variant={comparisonType === "year" ? "default" : "outline"} size="sm" onClick={() => setComparisonType("year")}>Год к году</Button>
      </div>

      <div className="flex items-center justify-center gap-4 py-4">
        <div className="text-center"><div className="text-xs text-muted-foreground">Текущий</div><div className="font-bold">{current_period.label}</div></div>
        <span className="text-muted-foreground font-bold">VS</span>
        <div className="text-center"><div className="text-xs text-muted-foreground">Предыдущий</div><div className="font-bold">{previous_period.label}</div></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Доходы" icon={<TrendingUp className="h-5 w-5 text-green-600" />} metric={metrics.total_income} higherIsBetter={true} />
        <MetricCard title="Расходы" icon={<TrendingDown className="h-5 w-5 text-red-600" />} metric={metrics.total_expense} higherIsBetter={false} />
        <MetricCard title="Чистый баланс" icon={<Minus className="h-5 w-5 text-blue-600" />} metric={metrics.net_balance} higherIsBetter={true} />
        <MetricCard title="Норма накоплений" icon={<TrendingUp className="h-5 w-5 text-purple-600" />} metric={metrics.savings_rate} isPercentage={true} higherIsBetter={true} />
      </div>

      <Card><CardHeader><CardTitle>Динамика показателей</CardTitle></CardHeader><CardContent><div className="h-64"><Line data={chartData} options={chartOptions} /></div></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Сравнение по категориям</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Категория</TableHead><TableHead>Текущий</TableHead><TableHead>Предыдущий</TableHead><TableHead>Изменение</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
          <TableBody>{by_category.slice(0, 10).map((cat) => (
            <TableRow key={cat.category}>
              <TableCell className="font-medium">{getTrendIcon(cat.trend)} {cat.category}</TableCell>
              <TableCell>{formatMoney(cat.current)}</TableCell>
              <TableCell>{formatMoney(cat.previous)}</TableCell>
              <TableCell style={{ color: getTrendColor(cat.trend, false) }}>{cat.change >= 0 ? "+" : ""}{formatMoney(cat.change)}</TableCell>
              <TableCell style={{ color: getTrendColor(cat.trend, false) }}>{cat.change_percentage >= 0 ? "+" : ""}{cat.change_percentage.toFixed(1)}%</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  metric: {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
    trend: "up" | "down" | "stable";
  };
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

function MetricCard({ title, icon, metric, isPercentage, higherIsBetter }: MetricCardProps) {
  const formatValue = (value: number) => isPercentage ? `${value.toFixed(1)}%` : formatMoney(value);
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-muted-foreground">{title}</span></div>
        <div className="text-2xl font-bold">{formatValue(metric.current)}</div>
        <div className="text-xs text-muted-foreground">Было: {formatValue(metric.previous)}</div>
        <div className="text-sm mt-1" style={{ color: getTrendColor(metric.trend, higherIsBetter) }}>
          {getTrendIcon(metric.trend)} {metric.change >= 0 ? "+" : ""}{isPercentage ? metric.change.toFixed(1) + "%" : formatMoney(metric.change)} ({metric.change_percentage >= 0 ? "+" : ""}{metric.change_percentage.toFixed(1)}%)
        </div>
      </CardContent>
    </Card>
  );
}
