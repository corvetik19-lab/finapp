"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";

export type FinancialHealthScoreProps = { score: number; change: number; status: "good" | "warning" | "poor"; };

const statusLabels = { good: "Хорошее финансовое здоровье", warning: "Требует внимания", poor: "Нужны улучшения" };
const statusColors = { good: "text-green-600", warning: "text-yellow-600", poor: "text-red-600" };
const progressColors = { good: "stroke-green-500", warning: "stroke-yellow-500", poor: "stroke-red-500" };

export default function FinancialHealthScore({ score, change, status }: FinancialHealthScoreProps) {
  const isPositiveChange = change >= 0;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Финансовое здоровье</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" className="stroke-muted" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" className={cn("transition-all", progressColors[status])} strokeWidth="10" strokeLinecap="round" style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-3xl font-bold">{score}</div><div className="text-xs text-muted-foreground">Баллов</div></div>
          </div>
          <div className="space-y-2">
            <div className={cn("font-medium", statusColors[status])}>{statusLabels[status]}</div>
            <div className={cn("flex items-center gap-1 text-sm", isPositiveChange ? "text-green-600" : "text-red-600")}>
              {isPositiveChange ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositiveChange ? "+" : ""}{change} баллов за месяц
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
