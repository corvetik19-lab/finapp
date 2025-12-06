"use client";

import { useEffect, useState } from "react";
import { type OptimizationReport, getPriorityColor, getImpactColor } from "@/lib/ai/optimization-advisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Lightbulb, TrendingDown, DollarSign, Target } from "lucide-react";

export default function OptimizationView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      const res = await fetch("/api/ai/optimization");
      if (!res.ok) {
        throw new Error("Failed to load optimization report");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading optimization:", err);
      setError("Не удалось загрузить рекомендации");
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (kopecks: number) => {
    const rubles = kopecks / 100;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rubles);
  };

  if (loading) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="mt-4 text-muted-foreground">Анализируем возможности экономии...</p></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h2 className="text-lg font-semibold">Ошибка загрузки</h2><p className="text-muted-foreground">{error}</p></CardContent></Card>;
  }

  if (!report || report.opportunities.length === 0) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><CheckCircle className="h-12 w-12 text-green-500 mb-4" /><h2 className="text-lg font-semibold">Ваш бюджет оптимален!</h2><p className="text-muted-foreground">Мы не нашли значительных возможностей для экономии</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><DollarSign className="h-8 w-8 mx-auto text-green-500 mb-2" /><div className="text-xs text-muted-foreground">Потенциальная экономия</div><div className="text-xl font-bold">{formatMoney(report.total_potential_savings)}</div><div className="text-xs text-muted-foreground">в месяц</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><TrendingDown className="h-8 w-8 mx-auto text-blue-500 mb-2" /><div className="text-xs text-muted-foreground">Текущие траты</div><div className="text-xl font-bold">{formatMoney(report.total_monthly_spending)}</div><div className="text-xs text-muted-foreground">в месяц</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Target className="h-8 w-8 mx-auto text-purple-500 mb-2" /><div className="text-xs text-muted-foreground">Рекомендуемый бюджет</div><div className="text-xl font-bold">{formatMoney(report.recommended_spending)}</div><div className="text-xs text-muted-foreground">в месяц</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><TrendingDown className="h-8 w-8 mx-auto text-emerald-500 mb-2" /><div className="text-xs text-muted-foreground">Сокращение</div><div className="text-xl font-bold text-green-500">-{report.savings_percentage.toFixed(1)}%</div><div className="text-xs text-muted-foreground">от текущих трат</div></CardContent></Card>
      </div>

      {report.quick_wins.length > 0 && (
        <Card><CardHeader><CardTitle>⚡ Быстрые победы</CardTitle><p className="text-sm text-muted-foreground">Простые действия с быстрым результатом</p></CardHeader><CardContent>
          <div className="grid md:grid-cols-2 gap-2">{report.quick_wins.map((win, idx) => (<div key={idx} className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /><span className="text-sm">{win}</span></div>))}</div>
        </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle>🎯 Топ-3 категории для оптимизации</CardTitle></CardHeader><CardContent>
        <div className="grid md:grid-cols-3 gap-4">{report.top_3_categories.map((cat, idx) => (
          <div key={cat.category} className="p-4 rounded-lg border"><Badge className="mb-2">#{idx + 1}</Badge><div className="font-semibold mb-2">{cat.category}</div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Сейчас:</span><span>{formatMoney(cat.current)}/мес</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Экономия:</span><span className="text-green-500 font-semibold">{formatMoney(cat.savings)}/мес</span></div></div>
        ))}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Возможности оптимизации ({report.opportunities.length})</CardTitle></CardHeader><CardContent className="space-y-4">
        {report.opportunities.map((opp) => (
          <div key={opp.id} className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-2"><span className="font-semibold">{opp.category}</span><Badge style={{ backgroundColor: getPriorityColor(opp.priority) }}>{opp.priority === "high" ? "ВЫСОКИЙ" : opp.priority === "medium" ? "СРЕДНИЙ" : "НИЗКИЙ"}</Badge></div><span className="text-green-500 font-semibold">Экономия: {formatMoney(opp.potential_savings)}/мес</span></div>
            <div className="grid grid-cols-3 gap-4 text-sm"><div><span className="text-muted-foreground">Тратите:</span> <span className="font-medium">{formatMoney(opp.current_spending)}</span></div><div><span className="text-muted-foreground">Рекомендуем:</span> <span className="font-medium text-green-500">{formatMoney(opp.recommended_spending)}</span></div><div><span className="text-muted-foreground">Сокращение:</span> <span className="font-medium text-yellow-500">-{opp.savings_percentage.toFixed(1)}%</span></div></div>
            <div className="text-sm"><strong>💬 Совет:</strong> {opp.advice}</div>
            <div className="text-sm"><strong>📋 Действия:</strong><ul className="list-disc list-inside mt-1">{opp.specific_tips.map((tip, idx) => (<li key={idx}>{tip}</li>))}</ul></div>
          </div>
        ))}
      </CardContent></Card>

      {report.money_leaks.length > 0 && (
        <Card><CardHeader><CardTitle>🚰 Денежные утечки</CardTitle><p className="text-sm text-muted-foreground">Мелкие траты, которые незаметно съедают бюджет</p></CardHeader><CardContent className="space-y-3">
          {report.money_leaks.map((leak, idx) => (
            <div key={idx} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3"><span className="font-semibold">{leak.category}</span><Badge style={{ backgroundColor: getImpactColor(leak.impact) }}>{leak.impact === "high" ? "ВЫСОКОЕ" : leak.impact === "medium" ? "СРЕДНЕЕ" : "НИЗКОЕ"}</Badge></div>
              <div className="grid grid-cols-4 gap-4 text-sm mb-3"><div><div className="text-muted-foreground">Частота</div><div className="font-medium">{leak.frequency}/мес</div></div><div><div className="text-muted-foreground">Средний чек</div><div className="font-medium">{formatMoney(leak.average_amount)}</div></div><div><div className="text-muted-foreground">Итого</div><div className="font-medium text-red-500">{formatMoney(leak.monthly_total)}</div></div><div><div className="text-muted-foreground">Тип</div><div className="font-medium">{leak.leak_type === "frequent_small" ? "Частые мелкие" : leak.leak_type === "subscription" ? "Подписка" : "Импульсивные"}</div></div></div>
              <div className="text-sm"><strong>💡</strong> {leak.suggestion}</div>
            </div>
          ))}
        </CardContent></Card>
      )}

      {report.personalized_advice.length > 0 && (
        <Card><CardHeader><CardTitle>🎓 Персональные советы</CardTitle></CardHeader><CardContent>
          <div className="space-y-2">{report.personalized_advice.map((advice, idx) => (<div key={idx} className="p-3 rounded-lg bg-muted/50 text-sm">{advice}</div>))}</div>
        </CardContent></Card>
      )}
    </div>
  );
}
