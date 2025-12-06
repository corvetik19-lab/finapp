"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Lightbulb, AlertTriangle } from "lucide-react";
import type { TrendsReport } from "@/lib/analytics/trends";
import { formatMoney, getTrendIcon, getTrendColor, getVelocityBadge } from "@/lib/analytics/trends";

export default function TrendsView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/trends?months=6");
      if (!res.ok) {
        throw new Error("Failed to load trends");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading trends:", err);
      setError("Не удалось загрузить анализ трендов");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />Анализируем тренды...</div>;
  }

  if (error || !report) {
    return <div className="flex flex-col items-center justify-center py-12 text-destructive"><AlertCircle className="h-12 w-12 mb-2" /><h2 className="font-bold">Ошибка загрузки</h2><p>{error || "Нет данных"}</p></div>;
  }

  const { categories, overall_trend, insights, alerts } = report;

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Общий тренд</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div><div className="text-sm text-muted-foreground">Средний чек</div><div className="text-xl font-bold">{formatMoney(overall_trend.average_spending_per_transaction)}</div></div>
          <div><div className="text-sm text-muted-foreground">Транзакций</div><div className="text-xl font-bold">{overall_trend.total_transactions}</div></div>
          <div><div className="text-sm text-muted-foreground">Тренд</div><div className="text-xl font-bold" style={{ color: getTrendColor(overall_trend.trend_direction, false) }}>{getTrendIcon(overall_trend.trend_direction)} {overall_trend.change_percentage >= 0 ? "+" : ""}{overall_trend.change_percentage.toFixed(1)}%</div></div>
        </div>
      </CardContent></Card>

      {insights.length > 0 && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Ключевые инсайты</CardTitle></CardHeader><CardContent><div className="grid gap-2">{insights.map((insight, index) => (<div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">{insight}</div>))}</div></CardContent></Card>)}

      {alerts.length > 0 && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Предупреждения</CardTitle></CardHeader><CardContent><div className="space-y-2">{alerts.map((alert, index) => (<div key={index} className={cn("p-3 rounded-lg border", alert.severity === "high" ? "border-red-500 bg-red-50" : alert.severity === "medium" ? "border-yellow-500 bg-yellow-50" : "border-gray-300")}><div className="flex justify-between text-sm"><span className="font-medium">{alert.type === "rapid_growth" ? "🚀 Быстрый рост" : alert.type === "rapid_decline" ? "📉 Снижение" : alert.type === "volatility" ? "📊 Волатильность" : "⚠️ Аномалия"}</span><span className="text-xs">{alert.severity === "high" ? "ВЫСОКИЙ" : alert.severity === "medium" ? "СРЕДНИЙ" : "НИЗКИЙ"}</span></div><p className="text-sm mt-1">{alert.message}</p></div>))}</div></CardContent></Card>)}

      <Card><CardHeader><CardTitle>Тренды по категориям</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.slice(0, 10).map((cat) => (
            <div key={cat.category} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="font-medium">{cat.category}</span><span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: getVelocityBadge(cat.trend.velocity).color }}>{getVelocityBadge(cat.trend.velocity).text}</span></div>
              <div className="grid grid-cols-3 gap-2 text-sm"><div><div className="text-muted-foreground">Ср.чек</div><div className="font-medium">{formatMoney(cat.average_transaction)}</div></div><div><div className="text-muted-foreground">Транз.</div><div className="font-medium">{cat.transaction_count}</div></div><div><div className="text-muted-foreground">Всего</div><div className="font-medium">{formatMoney(cat.total_amount)}</div></div></div>
              <div className="text-sm" style={{ color: getTrendColor(cat.trend.direction, false) }}>{getTrendIcon(cat.trend.direction)} {cat.trend.direction === "growing" ? "Растёт" : cat.trend.direction === "declining" ? "Снижается" : "Стабильно"} ({cat.trend.change_percentage >= 0 ? "+" : ""}{cat.trend.change_percentage.toFixed(1)}%)</div>
              {cat.history.length > 1 && (<div className="h-16"><Line data={{ labels: cat.history.map((h) => { const [year, month] = h.month.split("-"); return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("ru-RU", { month: "short" }); }), datasets: [{ data: cat.history.map((h) => h.average / 100), borderColor: getTrendColor(cat.trend.direction, false), backgroundColor: "transparent", tension: 0.4, pointRadius: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} /></div>)}
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}
