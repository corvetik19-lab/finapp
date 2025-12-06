"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Bot } from "lucide-react";
import FinancialHealthScore from "./FinancialHealthScore";
import AIInsights from "./AIInsights";
import FinancialTips from "./FinancialTips";
import ForecastChart from "./ForecastChart";
import AnomaliesDetection from "./AnomaliesDetection";

type InsightType = "positive" | "warning" | "info";
type ScoreStatus = "good" | "warning" | "poor";

type Insight = {
  id: string;
  type: InsightType;
  title: string;
  text: string;
};

type Tip = {
  id: string;
  icon: string;
  title: string;
  text: string;
};

type ForecastMonth = {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: number;
};

type Forecast = {
  nextMonths: ForecastMonth[];
  summary: string;
};

type Anomaly = {
  id: string;
  type: "expense" | "income";
  category: string;
  amount: number;
  averageAmount: number;
  percentageChange: number;
  description: string;
  severity: "low" | "medium" | "high";
};

type AnalyticsData = {
  healthScore: number;
  scoreChange: number;
  scoreStatus: ScoreStatus;
  insights: Insight[];
  tips: Tip[];
  summary?: string;
  forecast?: Forecast;
  anomalies?: Anomaly[];
};

export default function AIAnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/ai/analytics");
        
        if (!res.ok) {
          throw new Error("Failed to load analytics");
        }
        
        const analyticsData = await res.json();
        setData(analyticsData);
        setError(null);
      } catch (err) {
        console.error("Error loading AI analytics:", err);
        setError("Не удалось загрузить аналитику. Попробуйте обновить страницу.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">AI Аналитика</h1><p className="text-muted-foreground">Загружаем персональные рекомендации...</p></div>
        <div className="flex flex-col items-center justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" /><p className="flex items-center gap-2"><Bot className="h-5 w-5" />AI анализирует ваши финансы...</p></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">AI Аналитика</h1><p className="text-muted-foreground">Персональные рекомендации на основе анализа ваших финансов</p></div>
        <div className="flex flex-col items-center justify-center py-16"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><p className="text-destructive mb-4">{error || "Произошла ошибка при загрузке данных"}</p><Button onClick={() => window.location.reload()}>Обновить страницу</Button></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" />AI Аналитика</h1>
          <p className="text-muted-foreground">Персональные рекомендации на основе анализа ваших финансов</p>
          {data.summary && <p className="text-sm mt-2 p-3 bg-muted/50 rounded-lg">{data.summary}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-2" />Обновить</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FinancialHealthScore score={data.healthScore} change={data.scoreChange} status={data.scoreStatus} />
        <AIInsights insights={data.insights} />
        {data.tips.length > 0 && <FinancialTips tips={data.tips} />}
        {data.forecast && <ForecastChart forecast={data.forecast} />}
        {data.anomalies !== undefined && <AnomaliesDetection anomalies={data.anomalies} />}
      </div>
    </div>
  );
}
