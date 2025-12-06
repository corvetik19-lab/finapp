"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import EnhancedForecastView from "@/components/forecasts/EnhancedForecastView";
import GoalForecastView from "@/components/forecasts/GoalForecastView";
import SpendingAlertsView from "@/components/forecasts/SpendingAlertsView";
import OptimizationView from "@/components/forecasts/OptimizationView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, Target } from "lucide-react";

interface ExpenseForecast {
  month: string;
  predicted_expense: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  factors: string[];
}

interface WhatIfScenario {
  name: string;
  description: string;
  monthly_change: number;
  affects: "income" | "expense";
  category?: string;
}

interface ScenarioResult {
  scenario: WhatIfScenario;
  original_balance: number;
  new_balance: number;
  difference: number;
  impact_percentage: number;
  recommendation: string;
  timeline: { month: string; balance: number }[];
}

export default function ForecastsClient() {
  const [mounted, setMounted] = useState(false);
  const [forecast, setForecast] = useState<ExpenseForecast | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"enhanced" | "forecast" | "scenarios" | "goals" | "risks" | "optimization">("enhanced");
  
  // Сценарии
  const [selectedScenario, setSelectedScenario] = useState<WhatIfScenario | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);

  // Устанавливаем флаг после монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  const predefinedScenarios: WhatIfScenario[] = [
    {
      name: "Повышение зарплаты",
      description: "Если зарплата вырастет на 20%",
      monthly_change: 3000000, // 30k рублей в копейках
      affects: "income",
    },
    {
      name: "Отказ от кафе",
      description: "Перестать покупать кофе и обеды вне дома",
      monthly_change: -1000000, // -10k
      affects: "expense",
      category: "Кафе и рестораны",
    },
    {
      name: "Переезд в другой город",
      description: "Снижение арендной платы на 30%",
      monthly_change: -1500000, // -15k
      affects: "expense",
      category: "Жилье",
    },
    {
      name: "Покупка авто",
      description: "Новые расходы на содержание автомобиля",
      monthly_change: 2000000, // +20k
      affects: "expense",
      category: "Транспорт",
    },
  ];

  useEffect(() => {
    fetchForecast();
  }, []);

  async function fetchForecast() {
    try {
      const res = await fetch("/api/ai/forecast?type=expense_simple");
      if (res.ok) {
        const data = await res.json();
        setForecast(data.forecast);
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch forecast:", error);
    } finally {
      setLoading(false);
    }
  }

  async function simulateScenario(scenario: WhatIfScenario) {
    setSelectedScenario(scenario);
    try {
      const res = await fetch(
        `/api/ai/forecast?type=scenario&scenario=${encodeURIComponent(JSON.stringify(scenario))}&months=12`
      );
      if (res.ok) {
        const data = await res.json();
        setScenarioResult(data.scenario_result);
      }
    } catch (error) {
      console.error("Failed to simulate scenario:", error);
    }
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  }

  function getTrendText(trend: string) {
    switch (trend) {
      case "increasing":
        return "Расходы растут";
      case "decreasing":
        return "Расходы снижаются";
      default:
        return "Расходы стабильны";
    }
  }

  // Данные для графика сценариев
  const scenarioChartData = scenarioResult ? {
    labels: scenarioResult.timeline.map(t => t.month),
    datasets: [
      {
        label: "С изменением",
        data: scenarioResult.timeline.map(t => t.balance / 100),
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.4,
      },
      {
        label: "Без изменения",
        data: scenarioResult.timeline.map((_, i) => 
          (scenarioResult.original_balance * (i + 1)) / 100
        ),
        borderColor: "rgb(156, 163, 175)",
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  } : null;

  if (!mounted) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold">Финансовые прогнозы</h1><p className="text-muted-foreground">AI анализ и сценарии &quot;Что если?&quot;</p></div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}><TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="enhanced">🔮 Улучшенный</TabsTrigger>
        <TabsTrigger value="forecast">📊 Простой</TabsTrigger>
        <TabsTrigger value="scenarios">🎯 Сценарии</TabsTrigger>
        <TabsTrigger value="goals">🎯 Цели</TabsTrigger>
        <TabsTrigger value="risks">⚠️ Риски</TabsTrigger>
        <TabsTrigger value="optimization">💡 Оптимизация</TabsTrigger>
      </TabsList></Tabs>

      {activeTab === "enhanced" && <EnhancedForecastView />}

      {activeTab === "goals" && <GoalForecastView />}

      {activeTab === "risks" && <SpendingAlertsView />}

      {activeTab === "optimization" && <OptimizationView />}

      {activeTab === "forecast" && <div className="space-y-4">
        {loading ? <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Анализируем...</div>
        : !forecast ? <Card><CardContent className="py-12 text-center"><div className="text-4xl mb-4">📊</div><h2 className="text-lg font-semibold">Недостаточно данных</h2><p className="text-muted-foreground">Нужно минимум 2 месяца транзакций</p></CardContent></Card>
        : <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Прогноз на {forecast.month}</CardTitle><Badge variant="outline">Уверенность: {forecast.confidence}%</Badge></div></CardHeader><CardContent className="space-y-4">
          <div className="text-3xl font-bold">{formatMoney(forecast.predicted_expense)}<span className="text-base font-normal text-muted-foreground ml-2 flex items-center gap-1 inline-flex">{forecast.trend === 'increasing' ? <TrendingUp className="h-4 w-4 text-red-500" /> : forecast.trend === 'decreasing' ? <TrendingDown className="h-4 w-4 text-green-500" /> : <Minus className="h-4 w-4" />}{getTrendText(forecast.trend)}</span></div>
          {insights && <div className="flex gap-2 p-3 bg-blue-50 rounded-lg"><Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0" /><p className="text-sm">{insights}</p></div>}
          <div><h3 className="font-semibold mb-2">Факторы влияния:</h3><ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{forecast.factors.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
        </CardContent></Card>}
      </div>}

      {activeTab === "scenarios" && <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Готовые сценарии</h3>
          {predefinedScenarios.map((s, i) => <Card key={i} className={`cursor-pointer transition-colors hover:border-primary ${selectedScenario?.name === s.name ? 'border-primary bg-primary/5' : ''}`} onClick={() => simulateScenario(s)}><CardContent className="pt-4"><div className="font-medium">{s.name}</div><div className="text-sm text-muted-foreground">{s.description}</div><Badge className={`mt-2 ${(s.monthly_change > 0 && s.affects === 'income') || (s.monthly_change < 0 && s.affects === 'expense') ? 'bg-green-500' : 'bg-red-500'}`}>{s.monthly_change > 0 ? '+' : ''}{formatMoney(Math.abs(s.monthly_change))}/мес</Badge></CardContent></Card>)}
          <Card><CardHeader><CardTitle className="text-base">Создать свой</CardTitle></CardHeader><CardContent><form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); simulateScenario({ name: fd.get('name') as string, description: fd.get('description') as string, monthly_change: Number(fd.get('amount')) * 100, affects: fd.get('type') as 'income' | 'expense' }); e.currentTarget.reset(); }} className="space-y-3"><div><Label>Название</Label><Input name="name" placeholder="Фриланс" required /></div><div><Label>Описание</Label><Input name="description" placeholder="Доп. доход" required /></div><div className="grid grid-cols-2 gap-2"><div><Label>Тип</Label><select name="type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" required><option value="income">Доход</option><option value="expense">Расход</option></select></div><div><Label>Сумма/мес (₽)</Label><Input type="number" name="amount" placeholder="10000" min="0" required /></div></div><Button type="submit" className="w-full"><Target className="h-4 w-4 mr-1" />Симулировать</Button></form></CardContent></Card>
        </div>
        {scenarioResult && <Card><CardHeader><CardTitle>Результат симуляции</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center justify-around p-4 bg-muted rounded-lg"><div className="text-center"><div className="text-sm text-muted-foreground">Текущий</div><div className="text-xl font-bold">{formatMoney(scenarioResult.original_balance)}</div></div><span className="text-2xl">→</span><div className="text-center"><div className="text-sm text-muted-foreground">Новый</div><div className={`text-xl font-bold ${scenarioResult.new_balance > scenarioResult.original_balance ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(scenarioResult.new_balance)}</div></div></div>
          <div className="text-center"><strong>Изменение:</strong> <span className={scenarioResult.difference > 0 ? 'text-green-600' : 'text-red-600'}>{scenarioResult.difference > 0 ? '+' : ''}{formatMoney(scenarioResult.difference)}/мес ({(scenarioResult.impact_percentage || 0) > 0 ? '+' : ''}{(scenarioResult.impact_percentage || 0).toFixed(1)}%)</span></div>
          <div className="flex gap-2 p-3 bg-blue-50 rounded-lg"><Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0" /><p className="text-sm">{scenarioResult.recommendation}</p></div>
          {scenarioChartData && <div className="h-64"><h4 className="font-semibold mb-2">Прогноз на 12 месяцев</h4><Line data={scenarioChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v} ₽` } } } }} /></div>}
        </CardContent></Card>}
      </div>}
    </div>
  );
}
