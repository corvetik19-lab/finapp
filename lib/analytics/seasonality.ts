/**
 * Библиотека анализа сезонности расходов
 * 
 * Выявляет паттерны трат по:
 * - Месяцам года
 * - Сезонам (зима, весна, лето, осень)
 * - Дням недели
 * - Периодам месяца
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  amount: number;
  date: string;
  occurred_at: string;
  category_id: string | null;
  categories?: {
    name: string;
  } | null;
}

export interface SeasonalityReport {
  by_month: MonthlyPattern[];
  by_season: SeasonPattern[];
  by_weekday: WeekdayPattern[];
  by_day_of_month: DayOfMonthPattern[];
  heatmap_data: HeatmapData;
  insights: string[];
  recommendations: string[];
}

export interface MonthlyPattern {
  month: number; // 1-12
  month_name: string;
  average_spending: number;
  transaction_count: number;
  compared_to_average: number; // процент от среднего
  trend: "high" | "normal" | "low";
  top_categories: { category: string; amount: number }[];
}

export interface SeasonPattern {
  season: "winter" | "spring" | "summer" | "autumn";
  season_name: string;
  months: number[];
  average_spending: number;
  transaction_count: number;
  compared_to_average: number;
  characteristics: string;
}

export interface WeekdayPattern {
  weekday: number; // 0=Вс, 1=Пн, ..., 6=Сб
  weekday_name: string;
  average_spending: number;
  transaction_count: number;
  compared_to_average: number;
  peak_hours: number[];
}

export interface DayOfMonthPattern {
  day_range: string; // "1-10", "11-20", "21-31"
  average_spending: number;
  transaction_count: number;
  compared_to_average: number;
}

export interface HeatmapData {
  months: string[]; // ["Янв", "Фев", ...]
  categories: string[];
  data: number[][]; // [category_index][month_index] = amount
  max_value: number;
}

/**
 * Анализирует сезонность трат
 */
export async function analyzeSeasonality(
  supabase: SupabaseClient,
  userId: string,
  monthsBack: number = 12
): Promise<SeasonalityReport> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  // Получаем транзакции за период
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

  // Анализ по месяцам
  const byMonth = analyzeByMonth(transactions);

  // Анализ по сезонам
  const bySeason = analyzeBySeason(transactions);

  // Анализ по дням недели
  const byWeekday = analyzeByWeekday(transactions);

  // Анализ по периодам месяца
  const byDayOfMonth = analyzeByDayOfMonth(transactions);

  // Heatmap данные
  const heatmapData = generateHeatmapData(transactions);

  // Инсайты
  const insights = generateInsights(byMonth, bySeason, byWeekday);

  // Рекомендации
  const recommendations = generateRecommendations(byMonth, bySeason, byDayOfMonth);

  return {
    by_month: byMonth,
    by_season: bySeason,
    by_weekday: byWeekday,
    by_day_of_month: byDayOfMonth,
    heatmap_data: heatmapData,
    insights,
    recommendations,
  };
}

function analyzeByMonth(transactions: Transaction[]): MonthlyPattern[] {
  const monthData = new Map<number, { total: number; count: number; categories: Map<string, number> }>();

  transactions.forEach((t) => {
    const month = new Date(t.occurred_at).getMonth() + 1;
    const amount = Math.abs(t.amount);
    const category = t.categories?.name || "Без категории";

    if (!monthData.has(month)) {
      monthData.set(month, { total: 0, count: 0, categories: new Map() });
    }

    const data = monthData.get(month)!;
    data.total += amount;
    data.count += 1;
    data.categories.set(category, (data.categories.get(category) || 0) + amount);
  });

  // Средние траты
  const allTotals = Array.from(monthData.values()).map((d) => d.total);
  const overallAverage = allTotals.reduce((sum, val) => sum + val, 0) / allTotals.length;

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const result: MonthlyPattern[] = [];

  for (let month = 1; month <= 12; month++) {
    const data = monthData.get(month);
    if (!data) continue;

    const avgSpending = Math.round(data.total / (monthData.size || 1));
    const comparedToAverage = overallAverage > 0 ? ((avgSpending - overallAverage) / overallAverage) * 100 : 0;

    const topCategories = Array.from(data.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount }));

    result.push({
      month,
      month_name: monthNames[month - 1],
      average_spending: avgSpending,
      transaction_count: data.count,
      compared_to_average: Math.round(comparedToAverage * 10) / 10,
      trend: comparedToAverage > 15 ? "high" : comparedToAverage < -15 ? "low" : "normal",
      top_categories: topCategories,
    });
  }

  return result.sort((a, b) => a.month - b.month);
}

function analyzeBySeason(transactions: Transaction[]): SeasonPattern[] {
  const seasons: Array<{
    season: "winter" | "spring" | "summer" | "autumn";
    season_name: string;
    months: number[];
    characteristics: string;
  }> = [
    { season: "winter", season_name: "Зима", months: [12, 1, 2], characteristics: "Новый год, праздники, отопление" },
    { season: "spring", season_name: "Весна", months: [3, 4, 5], characteristics: "Обновление гардероба, ремонт" },
    { season: "summer", season_name: "Лето", months: [6, 7, 8], characteristics: "Отпуск, путешествия, дача" },
    { season: "autumn", season_name: "Осень", months: [9, 10, 11], characteristics: "Школа, подготовка к зиме" },
  ];

  const result: SeasonPattern[] = [];
  let totalAvg = 0;
  let totalCount = 0;

  seasons.forEach((seasonInfo) => {
    const seasonTransactions = transactions.filter((t) => {
      const month = new Date(t.occurred_at).getMonth() + 1;
      return seasonInfo.months.includes(month);
    });

    const total = seasonTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgSpending = seasonTransactions.length > 0 ? Math.round(total / seasonTransactions.length) : 0;

    totalAvg += avgSpending;
    totalCount++;

    result.push({
      season: seasonInfo.season,
      season_name: seasonInfo.season_name,
      months: seasonInfo.months,
      average_spending: avgSpending,
      transaction_count: seasonTransactions.length,
      compared_to_average: 0, // обновим после
      characteristics: seasonInfo.characteristics,
    });
  });

  const overallAvg = totalCount > 0 ? totalAvg / totalCount : 0;

  result.forEach((s) => {
    s.compared_to_average = overallAvg > 0
      ? Math.round(((s.average_spending - overallAvg) / overallAvg) * 1000) / 10
      : 0;
  });

  return result;
}

function analyzeByWeekday(transactions: Transaction[]): WeekdayPattern[] {
  const weekdayData = new Map<number, { total: number; count: number; hours: Map<number, number> }>();

  transactions.forEach((t) => {
    const date = new Date(t.occurred_at);
    const weekday = date.getDay();
    const hour = date.getHours();
    const amount = Math.abs(t.amount);

    if (!weekdayData.has(weekday)) {
      weekdayData.set(weekday, { total: 0, count: 0, hours: new Map() });
    }

    const data = weekdayData.get(weekday)!;
    data.total += amount;
    data.count += 1;
    data.hours.set(hour, (data.hours.get(hour) || 0) + 1);
  });

  const allTotals = Array.from(weekdayData.values()).map((d) => d.total / d.count);
  const overallAverage = allTotals.reduce((sum, val) => sum + val, 0) / allTotals.length;

  const weekdayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

  const result: WeekdayPattern[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const data = weekdayData.get(weekday);
    if (!data) continue;

    const avgSpending = Math.round(data.total / data.count);
    const comparedToAverage = overallAverage > 0 ? ((avgSpending - overallAverage) / overallAverage) * 100 : 0;

    // Топ-3 часа
    const peakHours = Array.from(data.hours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    result.push({
      weekday,
      weekday_name: weekdayNames[weekday],
      average_spending: avgSpending,
      transaction_count: data.count,
      compared_to_average: Math.round(comparedToAverage * 10) / 10,
      peak_hours: peakHours,
    });
  }

  return result.sort((a, b) => a.weekday - b.weekday);
}

function analyzeByDayOfMonth(transactions: Transaction[]): DayOfMonthPattern[] {
  const ranges = [
    { range: "1-10", days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { range: "11-20", days: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { range: "21-31", days: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
  ];

  const rangeData = new Map<string, { total: number; count: number }>();

  transactions.forEach((t) => {
    const day = new Date(t.occurred_at).getDate();
    const amount = Math.abs(t.amount);

    const matchedRange = ranges.find((r) => r.days.includes(day));
    if (!matchedRange) return;

    if (!rangeData.has(matchedRange.range)) {
      rangeData.set(matchedRange.range, { total: 0, count: 0 });
    }

    const data = rangeData.get(matchedRange.range)!;
    data.total += amount;
    data.count += 1;
  });

  const allTotals = Array.from(rangeData.values()).map((d) => d.total / d.count);
  const overallAverage = allTotals.reduce((sum, val) => sum + val, 0) / allTotals.length;

  const result: DayOfMonthPattern[] = [];

  ranges.forEach((r) => {
    const data = rangeData.get(r.range);
    if (!data) return;

    const avgSpending = Math.round(data.total / data.count);
    const comparedToAverage = overallAverage > 0 ? ((avgSpending - overallAverage) / overallAverage) * 100 : 0;

    result.push({
      day_range: r.range,
      average_spending: avgSpending,
      transaction_count: data.count,
      compared_to_average: Math.round(comparedToAverage * 10) / 10,
    });
  });

  return result;
}

function generateHeatmapData(transactions: Transaction[]): HeatmapData {
  const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  
  // Группируем по категориям и месяцам
  const categoryMonthMap = new Map<string, Map<number, number>>();

  transactions.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    const month = new Date(t.occurred_at).getMonth();
    const amount = Math.abs(t.amount);

    if (!categoryMonthMap.has(category)) {
      categoryMonthMap.set(category, new Map());
    }

    const monthMap = categoryMonthMap.get(category)!;
    monthMap.set(month, (monthMap.get(month) || 0) + amount);
  });

  // Топ-10 категорий по общей сумме
  const topCategories = Array.from(categoryMonthMap.entries())
    .map(([category, monthMap]) => {
      const total = Array.from(monthMap.values()).reduce((sum, val) => sum + val, 0);
      return { category, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((c) => c.category);

  // Строим матрицу
  const data: number[][] = [];
  let maxValue = 0;

  topCategories.forEach((category) => {
    const monthMap = categoryMonthMap.get(category)!;
    const row: number[] = [];

    for (let month = 0; month < 12; month++) {
      const value = monthMap.get(month) || 0;
      row.push(value);
      if (value > maxValue) maxValue = value;
    }

    data.push(row);
  });

  return {
    months: monthNames,
    categories: topCategories,
    data,
    max_value: maxValue,
  };
}

function generateInsights(
  byMonth: MonthlyPattern[],
  bySeason: SeasonPattern[],
  byWeekday: WeekdayPattern[]
): string[] {
  const insights: string[] = [];

  // Самый дорогой месяц
  const maxMonth = byMonth.reduce((max, m) => (m.average_spending > max.average_spending ? m : max));
  insights.push(`🔥 Самый дорогой месяц: ${maxMonth.month_name} (в среднем ${formatMoney(maxMonth.average_spending)})`);

  // Самый экономный месяц
  const minMonth = byMonth.reduce((min, m) => (m.average_spending < min.average_spending ? m : min));
  insights.push(`💰 Самый экономный месяц: ${minMonth.month_name} (в среднем ${formatMoney(minMonth.average_spending)})`);

  // Самый дорогой сезон
  const maxSeason = bySeason.reduce((max, s) => (s.average_spending > max.average_spending ? s : max));
  insights.push(`🌞 Самый дорогой сезон: ${maxSeason.season_name} (${maxSeason.characteristics})`);

  // Самый активный день недели
  const maxWeekday = byWeekday.reduce((max, w) => (w.transaction_count > max.transaction_count ? w : max));
  insights.push(`📅 Самый активный день: ${maxWeekday.weekday_name} (${maxWeekday.transaction_count} транзакций)`);

  return insights;
}

function generateRecommendations(
  byMonth: MonthlyPattern[],
  bySeason: SeasonPattern[],
  byDayOfMonth: DayOfMonthPattern[]
): string[] {
  const recommendations: string[] = [];

  // Высокие траты в определённые месяцы
  const highMonths = byMonth.filter((m) => m.trend === "high");
  if (highMonths.length > 0) {
    const names = highMonths.map((m) => m.month_name).join(", ");
    recommendations.push(`📊 В ${names} траты выше среднего. Планируйте бюджет заранее.`);
  }

  // Начало месяца vs конец месяца
  const earlyMonth = byDayOfMonth.find((d) => d.day_range === "1-10");
  const lateMonth = byDayOfMonth.find((d) => d.day_range === "21-31");
  
  if (earlyMonth && lateMonth && earlyMonth.average_spending > lateMonth.average_spending * 1.3) {
    recommendations.push(`💡 В начале месяца тратите на ${Math.round(earlyMonth.compared_to_average)}% больше. Распределяйте расходы равномернее.`);
  }

  // Сезонные рекомендации
  const expensiveSeason = bySeason.reduce((max, s) => (s.average_spending > max.average_spending ? s : max));
  recommendations.push(`🎯 ${expensiveSeason.season_name} — самый дорогой сезон. Откладывайте деньги заранее.`);

  return recommendations;
}

function getEmptyReport(): SeasonalityReport {
  return {
    by_month: [],
    by_season: [],
    by_weekday: [],
    by_day_of_month: [],
    heatmap_data: {
      months: [],
      categories: [],
      data: [],
      max_value: 0,
    },
    insights: [],
    recommendations: [],
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
