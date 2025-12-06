"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Lightbulb, Target } from "lucide-react";
import type { SeasonalityReport } from "@/lib/analytics/seasonality";
import { formatMoney } from "@/lib/analytics/seasonality";

export default function SeasonalityView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SeasonalityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonality();
  }, []);

  async function loadSeasonality() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/seasonality?months=12");
      if (!res.ok) {
        throw new Error("Failed to load seasonality");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading seasonality:", err);
      setError("Не удалось загрузить анализ сезонности");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />Анализируем сезонность...</div>;
  }

  if (error || !report) {
    return <div className="flex flex-col items-center justify-center py-12 text-destructive"><AlertCircle className="h-12 w-12 mb-2" /><h2 className="font-bold">Ошибка загрузки</h2><p>{error || "Нет данных"}</p></div>;
  }

  const { by_month, by_season, by_weekday, by_day_of_month, heatmap_data, insights, recommendations } = report;

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Ключевые инсайты</CardTitle></CardHeader><CardContent><div className="grid gap-2">{insights.map((insight, index) => (<div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">{insight}</div>))}</div></CardContent></Card>

      {heatmap_data.data.length > 0 && (<Card><CardHeader><CardTitle>Тепловая карта трат</CardTitle></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Категория</th>{heatmap_data.months.map((month) => (<th key={month} className="p-1 text-center text-xs">{month}</th>))}</tr></thead>
        <tbody>{heatmap_data.categories.map((category, catIndex) => (<tr key={category}><td className="p-2 font-medium truncate max-w-[100px]">{category}</td>{heatmap_data.data[catIndex].map((value, monthIndex) => { const intensity = heatmap_data.max_value > 0 ? value / heatmap_data.max_value : 0; return (<td key={monthIndex} className="p-1 text-center text-xs" style={{ backgroundColor: getHeatmapColor(intensity) }} title={`${category} - ${heatmap_data.months[monthIndex]}: ${formatMoney(value)}`}>{value > 0 && formatShortMoney(value)}</td>); })}</tr>))}</tbody></table></div>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs"><span>Низкие</span><div className="w-24 h-3 rounded" style={{ background: "linear-gradient(to right, #f9fafb, #ea580c)" }} /><span>Высокие</span></div>
      </CardContent></Card>)}

      <Card><CardHeader><CardTitle>Анализ по месяцам</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{by_month.map((month) => (<div key={month.month} className={cn("p-3 rounded-lg border text-center", month.trend === "high" ? "border-red-500 bg-red-50" : month.trend === "low" ? "border-green-500 bg-green-50" : "")}><div className="font-medium">{month.month_name}</div><div className="text-lg font-bold">{formatMoney(month.average_spending)}</div><div className="text-xs text-muted-foreground">{month.compared_to_average >= 0 ? "+" : ""}{month.compared_to_average.toFixed(1)}%</div><div className="text-xs text-muted-foreground">{month.transaction_count} тр.</div></div>))}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Анализ по сезонам</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{by_season.map((season) => (<div key={season.season} className="p-4 rounded-lg border text-center"><div className="text-3xl">{getSeasonIcon(season.season)}</div><div className="font-medium">{season.season_name}</div><div className="text-lg font-bold">{formatMoney(season.average_spending)}</div><div className="text-xs text-muted-foreground">{season.compared_to_average >= 0 ? "+" : ""}{season.compared_to_average.toFixed(1)}%</div><div className="text-xs text-muted-foreground mt-1">{season.characteristics}</div></div>))}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Анализ по дням недели</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-7 gap-2">{by_weekday.map((weekday) => (<div key={weekday.weekday} className="p-2 rounded-lg border text-center"><div className="font-medium text-sm">{weekday.weekday_name}</div><div className="font-bold">{formatMoney(weekday.average_spending)}</div><div className="text-xs text-muted-foreground">{weekday.transaction_count} тр.</div>{weekday.peak_hours.length > 0 && <div className="text-xs text-muted-foreground">🕐 {weekday.peak_hours.map((h) => `${h}:00`).join(", ")}</div>}</div>))}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Траты по периодам месяца</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-3 gap-4">{by_day_of_month.map((range) => (<div key={range.day_range} className="p-3 rounded-lg border text-center"><div className="font-medium">{range.day_range} числа</div><div className="text-lg font-bold">{formatMoney(range.average_spending)}</div><div className="text-xs text-muted-foreground">{range.compared_to_average >= 0 ? "+" : ""}{range.compared_to_average.toFixed(1)}%</div></div>))}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Рекомендации</CardTitle></CardHeader><CardContent><div className="grid gap-2">{recommendations.map((rec, index) => (<div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">{rec}</div>))}</div></CardContent></Card>
    </div>
  );
}

function getHeatmapColor(intensity: number): string {
  // От белого к красному
  if (intensity === 0) return "#f9fafb";
  if (intensity < 0.2) return "#fef3c7";
  if (intensity < 0.4) return "#fcd34d";
  if (intensity < 0.6) return "#fbbf24";
  if (intensity < 0.8) return "#f59e0b";
  return "#ea580c";
}

function getSeasonIcon(season: string): string {
  switch (season) {
    case "winter":
      return "❄️";
    case "spring":
      return "🌸";
    case "summer":
      return "☀️";
    case "autumn":
      return "🍂";
    default:
      return "🌍";
  }
}

function formatShortMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  if (rubles >= 1000000) {
    return `${(rubles / 1000000).toFixed(1)}M`;
  }
  if (rubles >= 1000) {
    return `${(rubles / 1000).toFixed(0)}K`;
  }
  return `${Math.round(rubles)}`;
}
