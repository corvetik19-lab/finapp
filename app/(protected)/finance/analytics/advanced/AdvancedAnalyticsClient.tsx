"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, BarChart3, Thermometer, TrendingUp, Heart, ClipboardList } from "lucide-react";
import PeriodComparisonView from "@/components/analytics/PeriodComparisonView";
import SeasonalityView from "@/components/analytics/SeasonalityView";
import TrendsView from "@/components/analytics/TrendsView";
import FinancialHealthView from "@/components/analytics/FinancialHealthView";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PeriodComparison {
  current: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  previous: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  changes: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
}

interface TopTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  direction: "income" | "expense" | "transfer";
}

interface CategoryAverage {
  category: string;
  category_id: string;
  averageAmount: number;
  transactionCount: number;
  totalAmount: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface AnalyticsData {
  comparison: PeriodComparison;
  top5: TopTransaction[];
  categoryAverages: CategoryAverage[];
  trends: MonthlyTrend[];
}

export default function AdvancedAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [activeTab, setActiveTab] = useState<"comparison" | "seasonality" | "trends" | "health" | "overview">("comparison");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/advanced?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeClass = (change: number, inverse = false) => {
    if (change === 0) return "text-muted-foreground";
    const isPositive = inverse ? change < 0 : change > 0;
    return isPositive ? "text-green-600" : "text-red-600";
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "month": return "месяцем";
      case "quarter": return "кварталом";
      case "year": return "годом";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка аналитики...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive">
        Не удалось загрузить данные
      </div>
    );
  }

  // Chart data
  const trendsChartData = {
    labels: data.trends.map((t) => {
      const [year, month] = t.month.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("ru-RU", {
        month: "short",
        year: "2-digit",
      });
    }),
    datasets: [
      {
        label: "Доходы",
        data: data.trends.map((t) => t.income / 100),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
      {
        label: "Расходы",
        data: data.trends.map((t) => t.expense / 100),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "Баланс",
        data: data.trends.map((t) => t.balance / 100),
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const categoryChartData = {
    labels: data.categoryAverages.map((c) => c.category),
    datasets: [
      {
        label: "Средний чек",
        data: data.categoryAverages.map((c) => c.averageAmount / 100),
        backgroundColor: "rgba(79, 70, 229, 0.8)",
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Расширенная аналитика</h1>
          <p className="text-muted-foreground">Детальный анализ ваших финансов</p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant={activeTab === "comparison" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("comparison")}><BarChart3 className="h-4 w-4 mr-1" />Сравнение</Button>
            <Button variant={activeTab === "seasonality" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("seasonality")}><Thermometer className="h-4 w-4 mr-1" />Сезонность</Button>
            <Button variant={activeTab === "trends" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("trends")}><TrendingUp className="h-4 w-4 mr-1" />Тренды</Button>
            <Button variant={activeTab === "health" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("health")}><Heart className="h-4 w-4 mr-1" />Здоровье</Button>
            <Button variant={activeTab === "overview" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("overview")}><ClipboardList className="h-4 w-4 mr-1" />Обзор</Button>
          </div>
          {activeTab === "overview" && (
            <div className="flex gap-1">
              <Button variant={period === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod("month")}>Месяц</Button>
              <Button variant={period === "quarter" ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod("quarter")}>Квартал</Button>
              <Button variant={period === "year" ? "secondary" : "ghost"} size="sm" onClick={() => setPeriod("year")}>Год</Button>
            </div>
          )}
        </div>
      </div>

      {activeTab === "comparison" && <PeriodComparisonView />}
      {activeTab === "seasonality" && <SeasonalityView />}
      {activeTab === "trends" && <TrendsView />}
      {activeTab === "health" && <FinancialHealthView />}

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Period Comparison */}
          <Card>
            <CardHeader><CardTitle>Сравнение с прошлым {getPeriodLabel()}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Доходы</div>
                  <div className="text-xl font-bold">{formatMoney(data.comparison.current.income)}</div>
                  <div className="text-xs text-muted-foreground">Было: {formatMoney(data.comparison.previous.income)}</div>
                  <div className={cn("text-sm font-medium", getChangeClass(data.comparison.changes.income))}>{formatChange(data.comparison.changes.income)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Расходы</div>
                  <div className="text-xl font-bold">{formatMoney(data.comparison.current.expense)}</div>
                  <div className="text-xs text-muted-foreground">Было: {formatMoney(data.comparison.previous.expense)}</div>
                  <div className={cn("text-sm font-medium", getChangeClass(data.comparison.changes.expense, true))}>{formatChange(data.comparison.changes.expense)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Баланс</div>
                  <div className="text-xl font-bold">{formatMoney(data.comparison.current.balance)}</div>
                  <div className="text-xs text-muted-foreground">Было: {formatMoney(data.comparison.previous.balance)}</div>
                  <div className={cn("text-sm font-medium", getChangeClass(data.comparison.changes.balance))}>{formatChange(data.comparison.changes.balance)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Транзакций</div>
                  <div className="text-xl font-bold">{data.comparison.current.transactionCount}</div>
                  <div className="text-xs text-muted-foreground">Было: {data.comparison.previous.transactionCount}</div>
                  <div className={cn("text-sm font-medium", getChangeClass(data.comparison.changes.transactionCount))}>{formatChange(data.comparison.changes.transactionCount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Transactions */}
          <Card>
            <CardHeader><CardTitle>Топ-5 самых крупных операций</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.top5.map((t, index) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.description || t.category}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("ru-RU")} · {t.category}</div>
                    </div>
                    <div className={cn("font-bold", t.direction === "income" ? "text-green-600" : "text-red-600")}>
                      {t.direction === "income" ? "+" : "-"}{formatMoney(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category Averages */}
          <Card>
            <CardHeader><CardTitle>Средний чек по категориям</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 mb-4"><Bar data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value} ₽` } } } }} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.categoryAverages.map((c) => (
                  <div key={c.category_id} className="p-3 rounded-lg border">
                    <div className="font-medium">{c.category}</div>
                    <div className="text-sm text-muted-foreground">Средний: {formatMoney(c.averageAmount)} · {c.transactionCount} тр. · Всего: {formatMoney(c.totalAmount)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader><CardTitle>Тренды за 12 месяцев</CardTitle></CardHeader>
            <CardContent><div className="h-64"><Line data={trendsChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value} ₽` } } } }} /></div></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
