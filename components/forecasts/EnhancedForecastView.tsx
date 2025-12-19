"use client";

import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Wallet, RefreshCw, AlertCircle, BarChart3, Lightbulb } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CategoryForecast {
  category: string;
  categoryId: string;
  predicted: number;
  historical_avg: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  reasoning: string;
}

interface ForecastData {
  total_predicted: number;
  total_income_predicted: number;
  categories: CategoryForecast[];
  seasonality_factor: number;
  trend_direction: "up" | "down" | "stable";
  confidence: number;
  advice: string[];
}

export default function EnhancedForecastView() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);

  // Устанавливаем флаг после монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, mounted]);

  async function loadForecast() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/forecast?type=enhanced&months=${months}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки прогноза");
      }

      setForecast(data.enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "#ef4444";
    if (trend === "down") return "#10b981";
    return "#6b7280";
  };

  if (!mounted || loading) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="mt-4 text-muted-foreground">Анализируем ваши траты...</p></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h3 className="text-lg font-semibold">Ошибка загрузки прогноза</h3><p className="text-muted-foreground mb-4">{error}</p><Button onClick={loadForecast}><RefreshCw className="h-4 w-4 mr-2" />Попробовать снова</Button></CardContent></Card>;
  }

  if (!forecast || forecast.categories.length === 0) {
    return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><BarChart3 className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">Недостаточно данных</h3><p className="text-muted-foreground">Добавьте транзакции за несколько месяцев для построения прогноза</p></CardContent></Card>;
  }

  // Данные для графика
  const chartData = {
    labels: forecast.categories.slice(0, 10).map(c => c.category),
    datasets: [
      {
        label: "Прогноз",
        data: forecast.categories.slice(0, 10).map(c => c.predicted / 100),
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 2,
        fill: true,
      },
      {
        label: "Среднее",
        data: forecast.categories.slice(0, 10).map(c => c.historical_avg / 100),
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderColor: "rgba(156, 163, 175, 1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed?.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(0)}₽`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => `${value}₽`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Анализ за:</span>
        <Select value={String(months)} onValueChange={(v) => setMonths(parseInt(v))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 месяца</SelectItem><SelectItem value="6">6 месяцев</SelectItem><SelectItem value="12">12 месяцев</SelectItem></SelectContent></Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" />Прогноз на следующий месяц</CardTitle></CardHeader><CardContent>
          <div className="text-3xl font-bold">{formatMoney(forecast.total_predicted)}</div>
          <div className="flex items-center gap-4 mt-2 text-sm"><span style={{ color: getTrendColor(forecast.trend_direction) }}>{getTrendIcon(forecast.trend_direction)} {forecast.trend_direction === "up" ? "Рост" : forecast.trend_direction === "down" ? "Снижение" : "Стабильно"}</span><span className="text-muted-foreground">Уверенность: {forecast.confidence}%</span></div>
          {forecast.seasonality_factor !== 1.0 && <div className="text-sm mt-2">📅 Сезонность: {forecast.seasonality_factor > 1 ? "Высокие траты" : "Низкие траты"} ({(forecast.seasonality_factor * 100).toFixed(0)}%)</div>}
        </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-5 w-5" />Прогноз баланса</CardTitle></CardHeader><CardContent>
          <div className="text-3xl font-bold">{formatMoney(forecast.total_income_predicted - forecast.total_predicted)}</div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"><span>Доход: {formatMoney(forecast.total_income_predicted)}</span><span>Расход: {formatMoney(forecast.total_predicted)}</span></div>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Прогноз по категориям</CardTitle></CardHeader><CardContent><div className="h-64"><Line data={chartData} options={chartOptions} /></div></CardContent></Card>

      <Card><CardHeader><CardTitle>Детальный прогноз</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Категория</TableHead><TableHead>Прогноз</TableHead><TableHead>Среднее</TableHead><TableHead>Тренд</TableHead><TableHead>Уверенность</TableHead></TableRow></TableHeader>
          <TableBody>
            {forecast.categories.map((cat) => (
              <TableRow key={cat.categoryId || cat.category}>
                <TableCell><div className="font-medium">{cat.category}</div><div className="text-xs text-muted-foreground">{cat.reasoning}</div></TableCell>
                <TableCell className="font-bold">{formatMoney(cat.predicted)}</TableCell>
                <TableCell className="text-muted-foreground">{formatMoney(cat.historical_avg)}</TableCell>
                <TableCell><span style={{ color: getTrendColor(cat.trend) }}>{getTrendIcon(cat.trend)}</span></TableCell>
                <TableCell><div className="flex items-center gap-2"><Progress value={cat.confidence} className="flex-1 h-2" /><span className="text-xs">{cat.confidence}%</span></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {forecast.advice.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Рекомендации</CardTitle></CardHeader><CardContent>
          <ul className="space-y-2">{forecast.advice.map((advice, index) => (<li key={index} className="flex items-start gap-2"><span className="text-primary">•</span>{advice}</li>))}</ul>
        </CardContent></Card>
      )}
    </div>
  );
}
