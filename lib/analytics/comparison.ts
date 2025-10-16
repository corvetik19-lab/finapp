/**
 * Библиотека сравнения финансовых показателей за разные периоды
 * 
 * Анализирует:
 * - Месяц к месяцу (MoM - Month over Month)
 * - Год к году (YoY - Year over Year)
 * - Произвольные периоды
 * - Рост/падение по категориям
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  amount: number;
  direction: "income" | "expense" | "transfer";
  category_id: string | null;
  date: string;
  categories?: {
    name: string;
  } | null;
}

export interface PeriodComparison {
  period_type: "month" | "quarter" | "year" | "custom";
  current_period: {
    start: string;
    end: string;
    label: string;
  };
  previous_period: {
    start: string;
    end: string;
    label: string;
  };
  metrics: {
    total_income: ComparisonMetric;
    total_expense: ComparisonMetric;
    net_balance: ComparisonMetric;
    savings_rate: ComparisonMetric;
  };
  by_category: CategoryComparison[];
  timeline: TimelinePoint[];
}

export interface ComparisonMetric {
  current: number; // в копейках
  previous: number; // в копейках
  change: number; // в копейках
  change_percentage: number;
  trend: "up" | "down" | "stable";
}

export interface CategoryComparison {
  category: string;
  current: number;
  previous: number;
  change: number;
  change_percentage: number;
  trend: "up" | "down" | "stable";
}

export interface TimelinePoint {
  date: string; // ISO date
  label: string; // "Янв 2025"
  income: number;
  expense: number;
  balance: number;
}

/**
 * Сравнивает два периода (месяц к месяцу)
 */
export async function compareMonthToMonth(
  supabase: SupabaseClient,
  userId: string,
  targetMonth?: Date
): Promise<PeriodComparison> {
  const target = targetMonth || new Date();
  const current = {
    start: new Date(target.getFullYear(), target.getMonth(), 1),
    end: new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59),
  };
  
  const previous = {
    start: new Date(target.getFullYear(), target.getMonth() - 1, 1),
    end: new Date(target.getFullYear(), target.getMonth(), 0, 23, 59, 59),
  };

  return compareCustomPeriods(supabase, userId, current, previous, "month");
}

/**
 * Сравнивает год к году
 */
export async function compareYearToYear(
  supabase: SupabaseClient,
  userId: string,
  targetYear?: number
): Promise<PeriodComparison> {
  const year = targetYear || new Date().getFullYear();
  
  const current = {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59),
  };
  
  const previous = {
    start: new Date(year - 1, 0, 1),
    end: new Date(year - 1, 11, 31, 23, 59, 59),
  };

  return compareCustomPeriods(supabase, userId, current, previous, "year");
}

/**
 * Сравнивает произвольные периоды
 */
export async function compareCustomPeriods(
  supabase: SupabaseClient,
  userId: string,
  currentPeriod: { start: Date; end: Date },
  previousPeriod: { start: Date; end: Date },
  periodType: "month" | "quarter" | "year" | "custom" = "custom"
): Promise<PeriodComparison> {
  // Получаем транзакции за оба периода
  const [currentTransactions, previousTransactions] = await Promise.all([
    getTransactionsForPeriod(supabase, userId, currentPeriod.start, currentPeriod.end),
    getTransactionsForPeriod(supabase, userId, previousPeriod.start, previousPeriod.end),
  ]);

  // Рассчитываем метрики
  const currentMetrics = calculatePeriodMetrics(currentTransactions);
  const previousMetrics = calculatePeriodMetrics(previousTransactions);

  // Сравнение по категориям
  const byCategory = compareCategoriesBetweenPeriods(
    currentTransactions,
    previousTransactions
  );

  // Временная шкала (последние 12 месяцев)
  const timeline = await generateTimeline(supabase, userId, 12);

  return {
    period_type: periodType,
    current_period: {
      start: currentPeriod.start.toISOString(),
      end: currentPeriod.end.toISOString(),
      label: formatPeriodLabel(currentPeriod.start, periodType),
    },
    previous_period: {
      start: previousPeriod.start.toISOString(),
      end: previousPeriod.end.toISOString(),
      label: formatPeriodLabel(previousPeriod.start, periodType),
    },
    metrics: {
      total_income: createMetric(
        currentMetrics.income,
        previousMetrics.income
      ),
      total_expense: createMetric(
        currentMetrics.expense,
        previousMetrics.expense
      ),
      net_balance: createMetric(
        currentMetrics.balance,
        previousMetrics.balance
      ),
      savings_rate: {
        current: currentMetrics.savingsRate,
        previous: previousMetrics.savingsRate,
        change: currentMetrics.savingsRate - previousMetrics.savingsRate,
        change_percentage: previousMetrics.savingsRate > 0
          ? ((currentMetrics.savingsRate - previousMetrics.savingsRate) / previousMetrics.savingsRate) * 100
          : 0,
        trend: getTrend(currentMetrics.savingsRate, previousMetrics.savingsRate, true),
      },
    },
    by_category: byCategory,
    timeline,
  };
}

async function getTransactionsForPeriod(
  supabase: SupabaseClient,
  userId: string,
  start: Date,
  end: Date
) {
  const { data } = await supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true });

  return data || [];
}

function calculatePeriodMetrics(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.direction === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  return { income, expense, balance, savingsRate };
}

function createMetric(current: number, previous: number): ComparisonMetric {
  const change = current - previous;
  const changePercentage = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
  
  return {
    current,
    previous,
    change,
    change_percentage: Math.round(changePercentage * 10) / 10,
    trend: getTrend(current, previous),
  };
}

function getTrend(current: number, previous: number, higherIsBetter: boolean = false): "up" | "down" | "stable" {
  const threshold = 0.05; // 5%
  const change = previous !== 0 ? Math.abs((current - previous) / previous) : 0;

  if (change < threshold) return "stable";
  
  if (higherIsBetter) {
    return current > previous ? "up" : "down";
  }
  
  return current > previous ? "up" : "down";
}

function compareCategoriesBetweenPeriods(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[]
): CategoryComparison[] {
  const categories = new Map<string, { current: number; previous: number }>();

  // Текущий период
  currentTransactions
    .filter((t) => t.direction === "expense")
    .forEach((t) => {
      const cat = t.categories?.name || "Без категории";
      const existing = categories.get(cat) || { current: 0, previous: 0 };
      existing.current += Math.abs(t.amount);
      categories.set(cat, existing);
    });

  // Предыдущий период
  previousTransactions
    .filter((t) => t.direction === "expense")
    .forEach((t) => {
      const cat = t.categories?.name || "Без категории";
      const existing = categories.get(cat) || { current: 0, previous: 0 };
      existing.previous += Math.abs(t.amount);
      categories.set(cat, existing);
    });

  const result: CategoryComparison[] = [];
  
  categories.forEach((data, category) => {
    const change = data.current - data.previous;
    const changePercentage = data.previous !== 0
      ? (change / data.previous) * 100
      : data.current > 0 ? 100 : 0;

    result.push({
      category,
      current: data.current,
      previous: data.previous,
      change,
      change_percentage: Math.round(changePercentage * 10) / 10,
      trend: getTrend(data.current, data.previous),
    });
  });

  return result.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

async function generateTimeline(
  supabase: SupabaseClient,
  userId: string,
  months: number
): Promise<TimelinePoint[]> {
  const timeline: TimelinePoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const transactions = await getTransactionsForPeriod(supabase, userId, start, end);
    const metrics = calculatePeriodMetrics(transactions);

    timeline.push({
      date: start.toISOString(),
      label: formatMonthLabel(start),
      income: metrics.income,
      expense: metrics.expense,
      balance: metrics.balance,
    });
  }

  return timeline;
}

function formatPeriodLabel(date: Date, type: "month" | "quarter" | "year" | "custom"): string {
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  switch (type) {
    case "month":
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    case "year":
      return `${date.getFullYear()}`;
    case "quarter":
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    default:
      return date.toLocaleDateString("ru-RU");
  }
}

function formatMonthLabel(date: Date): string {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
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

export function getTrendIcon(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "📈";
    case "down":
      return "📉";
    case "stable":
      return "➡️";
  }
}

export function getTrendColor(trend: "up" | "down" | "stable", higherIsBetter: boolean = false): string {
  if (trend === "stable") return "#6b7280";
  
  if (higherIsBetter) {
    return trend === "up" ? "#10b981" : "#dc2626";
  }
  
  return trend === "up" ? "#dc2626" : "#10b981";
}
