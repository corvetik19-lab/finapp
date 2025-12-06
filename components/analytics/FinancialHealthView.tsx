"use client";

import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Lightbulb, Target } from "lucide-react";
import type { FinancialHealthReport } from "@/lib/analytics/financial-health";
import { getScoreColor, getGradeLabel } from "@/lib/analytics/financial-health";

export default function FinancialHealthView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FinancialHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinancialHealth();
  }, []);

  async function loadFinancialHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/financial-health");
      if (!res.ok) {
        throw new Error("Failed to load financial health");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading financial health:", err);
      setError("Не удалось загрузить оценку финансового здоровья");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />Анализируем финансовое здоровье...</div>;
  }

  if (error || !report) {
    return <div className="flex flex-col items-center justify-center py-12 text-destructive"><AlertCircle className="h-12 w-12 mb-2" /><h2 className="font-bold">Ошибка загрузки</h2><p>{error || "Нет данных"}</p></div>;
  }

  const { overall_score, grade, categories, insights, recommendations } = report;

  // Gauge chart data
  const gaugeData = {
    datasets: [
      {
        data: [overall_score, 100 - overall_score],
        backgroundColor: [getScoreColor(overall_score), "#e5e7eb"],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Финансовое здоровье</CardTitle></CardHeader><CardContent>
        <div className="flex flex-col items-center"><div className="relative w-48 h-32"><Doughnut data={gaugeData} options={gaugeOptions} /><div className="absolute inset-0 flex flex-col items-center justify-center pt-8"><div className="text-4xl font-bold" style={{ color: getScoreColor(overall_score) }}>{overall_score}</div><div className="text-sm text-muted-foreground">из 100</div><div className="px-2 py-1 rounded text-white text-xs mt-1" style={{ backgroundColor: getScoreColor(overall_score) }}>{getGradeLabel(grade)}</div></div></div></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Ключевые выводы</CardTitle></CardHeader><CardContent><div className="grid gap-2">{insights.map((insight, index) => (<div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">{insight}</div>))}</div></CardContent></Card>

      <Card><CardHeader><CardTitle>Оценка по категориям</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CategoryScoreCard title="💰 Сбережения" score={categories.savings.score} status={categories.savings.status} details={categories.savings.details} weight={categories.savings.weight} />
          <CategoryScoreCard title="📋 Бюджет" score={categories.budget.score} status={categories.budget.status} details={categories.budget.details} weight={categories.budget.weight} />
          <CategoryScoreCard title="💳 Долги" score={categories.debt.score} status={categories.debt.status} details={categories.debt.details} weight={categories.debt.weight} />
          <CategoryScoreCard title="📈 Стабильность" score={categories.stability.score} status={categories.stability.status} details={categories.stability.details} weight={categories.stability.weight} />
        </div>
      </CardContent></Card>

      {recommendations.length > 0 && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Рекомендации</CardTitle></CardHeader><CardContent><div className="space-y-3">{recommendations.map((rec, index) => (<div key={index} className={cn("p-4 rounded-lg border", rec.priority === "high" ? "border-red-500 bg-red-50" : rec.priority === "medium" ? "border-yellow-500 bg-yellow-50" : "border-gray-300")}><div className="flex justify-between text-sm mb-2"><span className="font-medium">{rec.category}</span><span className="text-green-600">+{rec.impact} баллов</span></div><div className="font-medium">{rec.title}</div><p className="text-sm text-muted-foreground mt-1">{rec.description}</p><div className="text-xs mt-2">{rec.priority === "high" ? "🔴 Высокий" : rec.priority === "medium" ? "🟡 Средний" : "🟢 Низкий"}</div></div>))}</div></CardContent></Card>)}
    </div>
  );
}

interface CategoryScoreCardProps {
  title: string;
  score: number;
  status: "excellent" | "good" | "fair" | "poor";
  details: string;
  weight: number;
}

function CategoryScoreCard({ title, score, status, details, weight }: CategoryScoreCardProps) {
  const statusColors = { excellent: "#10b981", good: "#3b82f6", fair: "#f59e0b", poor: "#dc2626" };
  const statusLabels = { excellent: "Отлично", good: "Хорошо", fair: "Норма", poor: "Плохо" };
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between text-sm"><span className="font-medium">{title}</span><span className="text-xs text-muted-foreground">Вес: {(weight * 100).toFixed(0)}%</span></div>
      <div className="text-2xl font-bold" style={{ color: statusColors[status] }}>{score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: statusColors[status] }} /></div>
      <div className="text-sm font-medium" style={{ color: statusColors[status] }}>{statusLabels[status]}</div>
      <div className="text-xs text-muted-foreground">{details}</div>
    </div>
  );
}
