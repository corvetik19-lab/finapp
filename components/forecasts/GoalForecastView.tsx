"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { generateMonthlyProgress, type GoalForecast } from "@/lib/ai/goal-forecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertCircle, Target, Lightbulb, AlertTriangle, Clock } from "lucide-react";

export default function GoalForecastView() {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<GoalForecast[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<GoalForecast | null>(null);

  useEffect(() => {
    loadForecasts();
  }, []);

  async function loadForecasts() {
    try {
      const res = await fetch("/api/ai/goal-forecast");
      if (!res.ok) {
        throw new Error("Failed to load forecasts");
      }
      const data = await res.json();
      setForecasts(data.forecasts || []);
      if (data.forecasts && data.forecasts.length > 0) {
        setSelectedPlan(data.forecasts[0]);
      }
    } catch (err) {
      console.error("Error loading goal forecasts:", err);
      setError("Не удалось загрузить прогнозы целей");
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
    });
  };

  if (loading) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="mt-4 text-muted-foreground">Анализируем ваши планы...</p></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h2 className="text-lg font-semibold">Ошибка загрузки</h2><p className="text-muted-foreground">{error}</p></CardContent></Card>;
  }

  if (forecasts.length === 0) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Target className="h-12 w-12 text-muted-foreground mb-4" /><h2 className="text-lg font-semibold">Нет финансовых планов</h2><p className="text-muted-foreground">Создайте финансовый план на странице «Планы»</p></CardContent></Card>;
  }

  // График прогресса для выбранного плана
  const chartData = selectedPlan
    ? (() => {
        const progress = generateMonthlyProgress(
          selectedPlan.current_amount,
          selectedPlan.goal_amount,
          selectedPlan.average_monthly_contribution,
          Math.min(selectedPlan.months_to_goal || 12, 24)
        );

        return {
          labels: progress.map((p) => p.month),
          datasets: [
            {
              label: "Прогнозируемая сумма",
              data: progress.map((p) => p.projected_amount / 100),
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              fill: true,
              tension: 0.4,
            },
            {
              label: "Целевая сумма",
              data: progress.map(() => selectedPlan.goal_amount / 100),
              borderColor: "#ef4444",
              borderDash: [5, 5],
              fill: false,
            },
          ],
        };
      })()
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            return `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString("ru-RU")} ₽`;
          },
        },
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
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1"><CardHeader><CardTitle>Ваши планы</CardTitle></CardHeader><CardContent className="space-y-3">
        {forecasts.map((forecast) => (
          <div key={forecast.plan_id} className={cn("p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50", selectedPlan?.plan_id === forecast.plan_id && "border-primary bg-primary/5")} onClick={() => setSelectedPlan(forecast)}>
            <div className="flex justify-between items-center"><h4 className="font-medium text-sm">{forecast.plan_name}</h4><span className="text-sm font-bold">{forecast.progress_percentage.toFixed(1)}%</span></div>
            <div className="text-xs text-muted-foreground mt-1">{formatMoney(forecast.current_amount)} / {formatMoney(forecast.goal_amount)}</div>
            <Progress value={Math.min(100, forecast.progress_percentage)} className="h-2 mt-2" />
            {forecast.estimated_completion_date && <div className="text-xs mt-2 flex items-center gap-1"><Target className="h-3 w-3" />{formatDate(forecast.estimated_completion_date)}</div>}
          </div>
        ))}
      </CardContent></Card>

      {selectedPlan && (
        <div className="lg:col-span-2 space-y-4">
          <Card><CardHeader><CardTitle>{selectedPlan.plan_name}</CardTitle><p className="text-sm text-muted-foreground">{selectedPlan.advice}</p></CardHeader><CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">Накоплено</div><div className="text-lg font-bold">{formatMoney(selectedPlan.current_amount)}</div></div>
              <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">Цель</div><div className="text-lg font-bold">{formatMoney(selectedPlan.goal_amount)}</div></div>
              <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">Осталось</div><div className="text-lg font-bold">{formatMoney(selectedPlan.remaining_amount)}</div></div>
              <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-xs text-muted-foreground">Взнос/мес</div><div className="text-lg font-bold">{formatMoney(selectedPlan.average_monthly_contribution)}</div></div>
            </div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Сценарии достижения</CardTitle></CardHeader><CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border"><div className="font-medium mb-2">🐢 Консервативный</div><div className="text-xl font-bold">{formatMoney(selectedPlan.scenarios.conservative.monthly_amount)}/мес</div><div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{selectedPlan.scenarios.conservative.months_to_goal} мес</div><div className="text-xs text-muted-foreground mt-1">{formatDate(selectedPlan.scenarios.conservative.completion_date)}</div></div>
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5"><div className="font-medium mb-2">🎯 Текущий темп</div><div className="text-xl font-bold">{formatMoney(selectedPlan.scenarios.current.monthly_amount)}/мес</div><div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{selectedPlan.scenarios.current.months_to_goal} мес</div><div className="text-xs text-muted-foreground mt-1">{formatDate(selectedPlan.scenarios.current.completion_date)}</div></div>
              <div className="p-4 rounded-lg border"><div className="font-medium mb-2">🚀 Агрессивный</div><div className="text-xl font-bold">{formatMoney(selectedPlan.scenarios.aggressive.monthly_amount)}/мес</div><div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{selectedPlan.scenarios.aggressive.months_to_goal} мес</div><div className="text-xs text-muted-foreground mt-1">{formatDate(selectedPlan.scenarios.aggressive.completion_date)}</div></div>
            </div>
          </CardContent></Card>

          {chartData && <Card><CardHeader><CardTitle>Прогноз достижения цели</CardTitle></CardHeader><CardContent><div className="h-64"><Line data={chartData} options={chartOptions} /></div></CardContent></Card>}

          {selectedPlan.target_date && selectedPlan.recommended_monthly_contribution && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Рекомендация</CardTitle></CardHeader><CardContent>
              <p>Для достижения цели к <strong>{formatDate(selectedPlan.target_date)}</strong> рекомендуем откладывать <strong>{formatMoney(selectedPlan.recommended_monthly_contribution)}</strong> в месяц.</p>
              {selectedPlan.average_monthly_contribution < selectedPlan.recommended_monthly_contribution && <p className="mt-2 text-yellow-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Текущие взносы недостаточны. Увеличьте на {formatMoney(selectedPlan.recommended_monthly_contribution - selectedPlan.average_monthly_contribution)}/мес.</p>}
            </CardContent></Card>
          )}

          {selectedPlan.topups_history.length > 0 && (
            <Card><CardHeader><CardTitle>Последние взносы ({selectedPlan.topups_count} всего)</CardTitle></CardHeader><CardContent>
              <div className="space-y-2">{selectedPlan.topups_history.slice(0, 5).map((topup, idx) => (<div key={idx} className="flex justify-between text-sm"><span className="text-muted-foreground">{new Date(topup.created_at).toLocaleDateString("ru-RU")}</span><span className="font-medium">{formatMoney(topup.amount)}</span></div>))}</div>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
