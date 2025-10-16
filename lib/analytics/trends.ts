/**
 * Библиотека анализа трендов и среднего чека
 * 
 * Анализирует:
 * - Средний чек по категориям
 * - Динамику изменения среднего чека
 * - Тренды роста/падения
 * - Скорость изменений
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface TrendsReport {
  categories: CategoryTrend[];
  overall_trend: OverallTrend;
  insights: string[];
  alerts: TrendAlert[];
}

export interface CategoryTrend {
  category: string;
  average_transaction: number; // средний чек
  transaction_count: number;
  total_amount: number;
  trend: {
    direction: "growing" | "declining" | "stable";
    change_percentage: number; // % изменения за период
    velocity: "fast" | "moderate" | "slow"; // скорость изменения
  };
  history: MonthlyData[];
}

export interface MonthlyData {
  month: string; // "2025-01"
  average: number;
  count: number;
  total: number;
}

export interface OverallTrend {
  average_spending_per_transaction: number;
  total_transactions: number;
  trend_direction: "growing" | "declining" | "stable";
  change_percentage: number;
}

export interface TrendAlert {
  type: "rapid_growth" | "rapid_decline" | "volatility" | "anomaly";
  category: string;
  message: string;
  severity: "high" | "medium" | "low";
}

/**
 * Анализирует тренды трат
 */
export async function analyzeTrends(
  supabase: SupabaseClient,
  userId: string,
  monthsBack: number = 6
): Promise<TrendsReport> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  // Получаем транзакции
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", startDate.toISOString())
    .lte("occurred_at", endDate.toISOString())
    .order("occurred_at", { ascending: true });

  if (!transactions || transactions.length === 0) {
    return getEmptyReport();
  }

  // Группируем по категориям
  const categoryData = groupByCategory(transactions);

  // Анализируем тренды по категориям
  const categories = analyzeCategoryTrends(categoryData, monthsBack);

  // Общий тренд
  const overallTrend = analyzeOverallTrend(transactions, monthsBack);

  // Инсайты
  const insights = generateInsights(categories, overallTrend);

  // Алерты
  const alerts = generateAlerts(categories);

  return {
    categories: categories.sort((a, b) => b.total_amount - a.total_amount),
    overall_trend: overallTrend,
    insights,
    alerts,
  };
}

function groupByCategory(transactions: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();

  transactions.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    if (!map.has(category)) {
      map.set(category, []);
    }
    map.get(category)!.push(t);
  });

  return map;
}

function analyzeCategoryTrends(
  categoryData: Map<string, any[]>,
  monthsBack: number
): CategoryTrend[] {
  const trends: CategoryTrend[] = [];

  categoryData.forEach((transactions, category) => {
    // Группируем по месяцам
    const monthlyData = groupByMonth(transactions);

    // Средний чек
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgTransaction = totalAmount / transactions.length;

    // Анализ тренда
    const trend = calculateTrend(monthlyData);

    trends.push({
      category,
      average_transaction: Math.round(avgTransaction),
      transaction_count: transactions.length,
      total_amount: totalAmount,
      trend,
      history: monthlyData,
    });
  });

  return trends;
}

function groupByMonth(transactions: any[]): MonthlyData[] {
  const monthMap = new Map<string, { amounts: number[]; count: number }>();

  transactions.forEach((t) => {
    const date = new Date(t.occurred_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = Math.abs(t.amount);

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { amounts: [], count: 0 });
    }

    const data = monthMap.get(monthKey)!;
    data.amounts.push(amount);
    data.count++;
  });

  const result: MonthlyData[] = [];

  monthMap.forEach((data, month) => {
    const total = data.amounts.reduce((sum, val) => sum + val, 0);
    const average = total / data.count;

    result.push({
      month,
      average: Math.round(average),
      count: data.count,
      total: Math.round(total),
    });
  });

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

function calculateTrend(history: MonthlyData[]): CategoryTrend["trend"] {
  if (history.length < 2) {
    return {
      direction: "stable",
      change_percentage: 0,
      velocity: "slow",
    };
  }

  // Сравниваем первую и вторую половину периода
  const midpoint = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, midpoint);
  const secondHalf = history.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, m) => sum + m.average, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, m) => sum + m.average, 0) / secondHalf.length;

  const changePercentage = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const absChange = Math.abs(changePercentage);

  let direction: "growing" | "declining" | "stable";
  if (absChange < 5) {
    direction = "stable";
  } else {
    direction = changePercentage > 0 ? "growing" : "declining";
  }

  let velocity: "fast" | "moderate" | "slow";
  if (absChange > 30) {
    velocity = "fast";
  } else if (absChange > 15) {
    velocity = "moderate";
  } else {
    velocity = "slow";
  }

  return {
    direction,
    change_percentage: Math.round(changePercentage * 10) / 10,
    velocity,
  };
}

function analyzeOverallTrend(transactions: any[], monthsBack: number): OverallTrend {
  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const avgPerTransaction = totalAmount / transactions.length;

  // Группируем по месяцам для тренда
  const monthlyData = groupByMonth(transactions);
  const trend = calculateTrend(monthlyData);

  return {
    average_spending_per_transaction: Math.round(avgPerTransaction),
    total_transactions: transactions.length,
    trend_direction: trend.direction,
    change_percentage: trend.change_percentage,
  };
}

function generateInsights(categories: CategoryTrend[], overall: OverallTrend): string[] {
  const insights: string[] = [];

  // Общий тренд
  if (overall.trend_direction === "growing") {
    insights.push(
      `📈 Средний чек растёт на ${Math.abs(overall.change_percentage).toFixed(1)}%`
    );
  } else if (overall.trend_direction === "declining") {
    insights.push(
      `📉 Средний чек снижается на ${Math.abs(overall.change_percentage).toFixed(1)}%`
    );
  } else {
    insights.push(`➡️ Средний чек стабилен`);
  }

  // Быстро растущие категории
  const fastGrowing = categories.filter(
    (c) => c.trend.direction === "growing" && c.trend.velocity === "fast"
  );
  if (fastGrowing.length > 0) {
    const names = fastGrowing.slice(0, 3).map((c) => c.category).join(", ");
    insights.push(`🚀 Быстрый рост трат: ${names}`);
  }

  // Быстро снижающиеся
  const fastDeclining = categories.filter(
    (c) => c.trend.direction === "declining" && c.trend.velocity === "fast"
  );
  if (fastDeclining.length > 0) {
    const names = fastDeclining.slice(0, 3).map((c) => c.category).join(", ");
    insights.push(`✅ Успешное сокращение: ${names}`);
  }

  // Самая дорогая категория
  const mostExpensive = categories.reduce((max, c) =>
    c.average_transaction > max.average_transaction ? c : max
  );
  insights.push(
    `💸 Самый высокий средний чек: ${mostExpensive.category} (${formatMoney(
      mostExpensive.average_transaction
    )})`
  );

  return insights;
}

function generateAlerts(categories: CategoryTrend[]): TrendAlert[] {
  const alerts: TrendAlert[] = [];

  categories.forEach((cat) => {
    // Быстрый рост
    if (cat.trend.direction === "growing" && cat.trend.velocity === "fast") {
      alerts.push({
        type: "rapid_growth",
        category: cat.category,
        message: `Траты в "${cat.category}" выросли на ${Math.abs(
          cat.trend.change_percentage
        ).toFixed(1)}%`,
        severity: cat.trend.change_percentage > 50 ? "high" : "medium",
      });
    }

    // Волатильность (если история есть)
    if (cat.history.length >= 3) {
      const averages = cat.history.map((h) => h.average);
      const stdDev = calculateStdDev(averages);
      const mean = averages.reduce((sum, val) => sum + val, 0) / averages.length;
      const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

      if (cv > 50) {
        alerts.push({
          type: "volatility",
          category: cat.category,
          message: `Сильные колебания трат в "${cat.category}"`,
          severity: "medium",
        });
      }
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function calculateStdDev(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

function getEmptyReport(): TrendsReport {
  return {
    categories: [],
    overall_trend: {
      average_spending_per_transaction: 0,
      total_transactions: 0,
      trend_direction: "stable",
      change_percentage: 0,
    },
    insights: [],
    alerts: [],
  };
}

export function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

export function getTrendIcon(direction: "growing" | "declining" | "stable"): string {
  switch (direction) {
    case "growing":
      return "📈";
    case "declining":
      return "📉";
    case "stable":
      return "➡️";
  }
}

export function getTrendColor(
  direction: "growing" | "declining" | "stable",
  higherIsBetter: boolean = false
): string {
  if (direction === "stable") return "#6b7280";

  if (higherIsBetter) {
    return direction === "growing" ? "#10b981" : "#dc2626";
  }

  return direction === "growing" ? "#dc2626" : "#10b981";
}

export function getVelocityBadge(velocity: "fast" | "moderate" | "slow"): {
  text: string;
  color: string;
} {
  switch (velocity) {
    case "fast":
      return { text: "БЫСТРО", color: "#dc2626" };
    case "moderate":
      return { text: "УМЕРЕННО", color: "#f59e0b" };
    case "slow":
      return { text: "МЕДЛЕННО", color: "#6b7280" };
  }
}
