/**
 * Улучшенный AI прогноз расходов
 * - Анализ истории за 3-6 месяцев
 * - Учёт сезонности и трендов
 * - Разбивка по категориям с confidence score
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface Transaction {
  amount: number;
  direction: string;
  occurred_at: string;
  category_id: string | null;
  categories: { id: string; name: string }[] | { id: string; name: string } | null;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  categories: {
    [category: string]: number;
  };
}

export interface CategoryForecast {
  category: string;
  categoryId: string;
  predicted: number;
  historical_avg: number;
  trend: "up" | "down" | "stable";
  confidence: number; // 0-100
  reasoning: string;
}

export interface ForecastResult {
  total_predicted: number;
  total_income_predicted: number;
  categories: CategoryForecast[];
  seasonality_factor: number;
  trend_direction: "up" | "down" | "stable";
  confidence: number;
  advice: string[];
}

/**
 * Получить исторические данные за последние N месяцев
 */
export async function getHistoricalData(
  supabase: SupabaseClient,
  userId: string,
  months: number = 6
): Promise<MonthlyData[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, direction, occurred_at, category_id, categories(id, name)")
    .eq("user_id", userId)
    .gte("occurred_at", startDate.toISOString())
    .order("occurred_at", { ascending: true });

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Группируем по месяцам
  const monthlyMap: Map<string, MonthlyData> = new Map();

  transactions.forEach((tx: Transaction) => {
    const month = tx.occurred_at.substring(0, 7); // YYYY-MM
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        income: 0,
        expense: 0,
        categories: {},
      });
    }

    const data = monthlyMap.get(month)!;
    const amount = Math.abs(tx.amount);

    if (tx.direction === "income") {
      data.income += amount;
    } else if (tx.direction === "expense") {
      data.expense += amount;

      // Группируем по категориям
      const categoryName = Array.isArray(tx.categories) 
        ? tx.categories[0]?.name 
        : tx.categories?.name || "Без категории";
      data.categories[categoryName] = (data.categories[categoryName] || 0) + amount;
    }
  });

  return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Анализ сезонности
 */
export function analyzeSeasonality(history: MonthlyData[]): {
  factor: number;
  pattern: string;
} {
  if (history.length < 3) {
    return { factor: 1.0, pattern: "Недостаточно данных" };
  }

  const currentMonth = new Date().getMonth(); // 0-11
  const expenses = history.map(h => h.expense);
  const avg = expenses.reduce((sum, v) => sum + v, 0) / expenses.length;

  // Ищем паттерн для текущего месяца
  const sameMonthExpenses = history.filter(h => {
    const month = parseInt(h.month.split("-")[1]) - 1;
    return month === currentMonth;
  });

  if (sameMonthExpenses.length > 0) {
    const sameMonthAvg = sameMonthExpenses.reduce((sum, h) => sum + h.expense, 0) / sameMonthExpenses.length;
    const factor = avg > 0 ? sameMonthAvg / avg : 1.0;
    
    let pattern = "Обычный месяц";
    if (factor > 1.2) pattern = "Высокие траты (праздники, отпуск)";
    else if (factor < 0.8) pattern = "Низкие траты";
    
    return { factor, pattern };
  }

  return { factor: 1.0, pattern: "Недостаточно данных для сезонности" };
}

/**
 * Определение тренда
 */
export function analyzeTrend(history: MonthlyData[]): {
  direction: "up" | "down" | "stable";
  percentage: number;
} {
  if (history.length < 3) {
    return { direction: "stable", percentage: 0 };
  }

  const expenses = history.map(h => h.expense);
  const firstHalf = expenses.slice(0, Math.floor(expenses.length / 2));
  const secondHalf = expenses.slice(Math.floor(expenses.length / 2));

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 10) return { direction: "up", percentage: change };
  if (change < -10) return { direction: "down", percentage: Math.abs(change) };
  return { direction: "stable", percentage: Math.abs(change) };
}

/**
 * Прогноз по категориям
 */
export async function forecastByCategory(
  history: MonthlyData[],
  supabase: SupabaseClient,
  userId: string
): Promise<CategoryForecast[]> {
  if (history.length === 0) return [];

  // Собираем все категории
  const categoryTotals: Map<string, { total: number; months: number; categoryId?: string }> = new Map();

  history.forEach(month => {
    Object.entries(month.categories).forEach(([category, amount]) => {
      const current = categoryTotals.get(category) || { total: 0, months: 0 };
      categoryTotals.set(category, {
        total: current.total + amount,
        months: current.months + 1,
      });
    });
  });

  // Получаем ID категорий
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .eq("kind", "expense");

  const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

  // Прогнозируем
  const forecasts: CategoryForecast[] = [];

  for (const [category, data] of categoryTotals.entries()) {
    const avg = data.total / data.months;
    
    // Простой тренд: последние 2 месяца vs предыдущие
    const recentMonths = history.slice(-2);
    const olderMonths = history.slice(0, -2);
    
    const recentAvg = recentMonths.reduce((sum, m) => sum + (m.categories[category] || 0), 0) / Math.max(recentMonths.length, 1);
    const olderAvg = olderMonths.reduce((sum, m) => sum + (m.categories[category] || 0), 0) / Math.max(olderMonths.length, 1);
    
    let trend: "up" | "down" | "stable" = "stable";
    if (recentAvg > olderAvg * 1.15) trend = "up";
    else if (recentAvg < olderAvg * 0.85) trend = "down";

    // Применяем тренд к прогнозу
    let predicted = avg;
    if (trend === "up") predicted *= 1.1;
    else if (trend === "down") predicted *= 0.9;

    // Confidence зависит от количества месяцев
    const confidence = Math.min(95, 50 + (data.months * 10));

    forecasts.push({
      category,
      categoryId: categoryMap.get(category) || "",
      predicted: Math.round(predicted),
      historical_avg: Math.round(avg),
      trend,
      confidence,
      reasoning: generateReasoning(trend, data.months, confidence),
    });
  }

  return forecasts.sort((a, b) => b.predicted - a.predicted);
}

function generateReasoning(trend: string, months: number, confidence: number): string {
  const trendText = trend === "up" ? "растут" : trend === "down" ? "снижаются" : "стабильны";
  const historyText = months >= 6 ? "достаточно истории" : months >= 3 ? "средняя история" : "мало истории";
  
  return `Траты ${trendText}. ${historyText} (${months} мес). Уверенность ${confidence}%`;
}

/**
 * Генерация AI советов
 * 
 * @param _forecast - Результат прогноза (планируется использовать для AI-анализа)
 * @param _history - Исторические данные (планируется использовать для AI-анализа)
 */
export async function generateAIAdvice(
  _forecast: ForecastResult,
  _history: MonthlyData[]
): Promise<string[]> {
  // Параметры планируются к использованию для AI-анализа
  void _forecast;
  void _history;
  // Fallback советы (временно отключаем AI из-за проблем с кодировкой кириллицы)
  const fallbackAdvice = [
    "Следите за категориями с растущими тратами",
    "Установите бюджеты для крупных категорий расходов",
    "Регулярно анализируйте отчёты для выявления паттернов",
  ];

  // TODO: Исправить кодировку для русского текста в API
  return fallbackAdvice;

  /* Отключено временно
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAdvice;
  }

  try {
    const topCategories = forecast.categories.slice(0, 5);
    const avgExpense = history.reduce((sum, h) => sum + h.expense, 0) / Math.max(history.length, 1);

    const prompt = `Ты финансовый советник. Проанализируй прогноз расходов и дай 3-5 кратких практических советов.

Прогноз на следующий месяц: ${(forecast.total_predicted / 100).toFixed(0)}₽
Средние траты: ${(avgExpense / 100).toFixed(0)}₽
Тренд: ${forecast.trend_direction === "up" ? "растёт" : forecast.trend_direction === "down" ? "падает" : "стабилен"}

Топ категорий:
${topCategories.map(c => `- ${c.category}: ${(c.predicted / 100).toFixed(0)}₽ (тренд: ${c.trend})`).join("\n")}

Дай 3-5 конкретных советов как оптимизировать расходы. Каждый совет - одно предложение.
Формат: просто список советов, без нумерации и заголовков.`;

    const { text } = await generateText({
      model: getCommandsModel(),
      prompt,
      temperature: 0.7,
    });

    // Разбиваем на строки и фильтруем пустые
    const advice = text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.match(/^\d+\./))
      .slice(0, 5);

    return advice.length > 0 ? advice : fallbackAdvice;
  } catch (error) {
    logger.error("AI advice error:", error);
    return fallbackAdvice;
  }
  */
}

/**
 * Основная функция прогноза
 */
export async function generateEnhancedForecast(
  supabase: SupabaseClient,
  userId: string,
  months: number = 6
): Promise<ForecastResult> {
  // Получаем исторические данные
  const history = await getHistoricalData(supabase, userId, months);

  if (history.length === 0) {
    return {
      total_predicted: 0,
      total_income_predicted: 0,
      categories: [],
      seasonality_factor: 1.0,
      trend_direction: "stable",
      confidence: 0,
      advice: ["Недостаточно данных для прогноза. Добавьте транзакции."],
    };
  }

  // Анализ
  const seasonality = analyzeSeasonality(history);
  const trend = analyzeTrend(history);
  const categoryForecasts = await forecastByCategory(history, supabase, userId);

  // Базовый прогноз - среднее за последние 3 месяца
  const recentHistory = history.slice(-3);
  const avgExpense = recentHistory.reduce((sum, h) => sum + h.expense, 0) / recentHistory.length;
  const avgIncome = recentHistory.reduce((sum, h) => sum + h.income, 0) / recentHistory.length;

  // Применяем сезонность и тренд
  let totalPredicted = avgExpense * seasonality.factor;
  if (trend.direction === "up") totalPredicted *= 1.05;
  else if (trend.direction === "down") totalPredicted *= 0.95;

  // Уверенность зависит от количества данных
  const confidence = Math.min(90, 40 + (history.length * 8));

  const result: ForecastResult = {
    total_predicted: Math.round(totalPredicted),
    total_income_predicted: Math.round(avgIncome * 1.0),
    categories: categoryForecasts,
    seasonality_factor: seasonality.factor,
    trend_direction: trend.direction,
    confidence,
    advice: [],
  };

  // Генерируем советы
  result.advice = await generateAIAdvice(result, history);

  return result;
}
