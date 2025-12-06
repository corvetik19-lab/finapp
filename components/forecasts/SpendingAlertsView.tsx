"use client";

import { useEffect, useState } from "react";
import { type AnomalyReport, getSeverityColor, getAlertIcon } from "@/lib/ai/anomaly-detector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, TrendingUp, AlertTriangle, Target } from "lucide-react";

export default function SpendingAlertsView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const res = await fetch("/api/ai/anomaly-detector");
      if (!res.ok) {
        throw new Error("Failed to load alerts");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading alerts:", err);
      setError("Не удалось загрузить предупреждения");
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
    return <Card><CardContent className="flex flex-col items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="mt-4 text-muted-foreground">Анализируем ваши траты...</p></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h2 className="text-lg font-semibold">Ошибка загрузки</h2><p className="text-muted-foreground">{error}</p></CardContent></Card>;
  }

  if (!report) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" /><h2 className="text-lg font-semibold">Нет данных</h2><p className="text-muted-foreground">Недостаточно транзакций для анализа</p></CardContent></Card>;
  }

  const { alerts, total_spending_this_month, avg_monthly_spending, change_percentage } =
    report;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Траты этого месяца</div><div className="text-xl font-bold">{formatMoney(total_spending_this_month)}</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Средние траты</div><div className="text-xl font-bold">{formatMoney(avg_monthly_spending)}</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Изменение</div><div className="text-xl font-bold" style={{ color: change_percentage >= 20 ? "#dc2626" : change_percentage >= 10 ? "#f59e0b" : "#10b981" }}>{change_percentage > 0 ? "+" : ""}{change_percentage.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Предупреждений</div><div className="text-xl font-bold" style={{ color: alerts.length >= 5 ? "#dc2626" : alerts.length >= 3 ? "#f59e0b" : "#10b981" }}>{alerts.length}</div></CardContent></Card>
      </div>

      {alerts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><CheckCircle className="h-12 w-12 text-green-500 mb-4" /><h2 className="text-lg font-semibold">Всё в порядке!</h2><p className="text-muted-foreground">Никаких рисков перерасхода не обнаружено</p></CardContent></Card>
      ) : (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Обнаружено {alerts.length} {alerts.length === 1 ? "предупреждение" : "предупреждений"}</CardTitle></CardHeader><CardContent className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-4 rounded-lg border-l-4" style={{ borderLeftColor: getSeverityColor(alert.severity) }}>
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span>{getAlertIcon(alert.type)}</span><span className="font-medium">{alert.title}</span></div><Badge style={{ backgroundColor: getSeverityColor(alert.severity) }}>{alert.severity === "critical" ? "КРИТИЧНО" : alert.severity === "high" ? "ВЫСОКИЙ" : alert.severity === "medium" ? "СРЕДНИЙ" : "НИЗКИЙ"}</Badge></div>
              <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
              <div className="text-sm"><strong>💡</strong> {alert.recommendation}</div>
              {alert.percentage && <div className="mt-2 flex items-center gap-2"><Progress value={Math.min(100, alert.percentage)} className="flex-1 h-2" /><span className="text-xs">{alert.percentage.toFixed(0)}%</span></div>}
            </div>
          ))}
        </CardContent></Card>
      )}

      {report.categories_at_risk.filter((c) => c.is_anomaly).length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Категории с резким ростом трат</CardTitle></CardHeader><CardContent>
          <div className="grid md:grid-cols-3 gap-4">{report.categories_at_risk.filter((c) => c.is_anomaly).slice(0, 6).map((cat) => (
            <div key={cat.category} className="p-3 rounded-lg border"><div className="font-medium">{cat.category}</div><div className="text-red-500 text-lg font-bold">+{cat.change_percentage.toFixed(0)}%</div><div className="text-sm text-muted-foreground"><span>{formatMoney(cat.current_month)}</span> <span className="text-xs">vs {formatMoney(cat.previous_avg)}</span></div></div>
          ))}</div>
        </CardContent></Card>
      )}

      {report.budgets_at_risk.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Бюджеты в зоне риска</CardTitle></CardHeader><CardContent className="space-y-3">
          {report.budgets_at_risk.map((budget) => (
            <div key={budget.budget_name} className="p-3 rounded-lg border">
              <div className="flex justify-between mb-2"><span className="font-medium">{budget.budget_name}</span><span className="text-sm text-muted-foreground">{budget.category}</span></div>
              <Progress value={Math.min(100, budget.percentage)} className="h-2 mb-2" style={{ ['--progress-background' as string]: budget.percentage >= 100 ? "#dc2626" : budget.percentage >= 90 ? "#ea580c" : "#f59e0b" }} />
              <div className="flex justify-between text-sm"><span>{formatMoney(budget.spent)} / {formatMoney(budget.limit)}</span><span className={budget.percentage >= 100 ? "text-red-500 font-bold" : "text-yellow-500"}>{budget.percentage.toFixed(0)}%</span></div>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
