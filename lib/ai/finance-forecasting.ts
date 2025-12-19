/**
 * AI Финансовое прогнозирование
 * Прогнозы доходов, расходов, баланса
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface MonthlyForecast {
  month: string;
  predictedIncome: number;
  predictedExpense: number;
  predictedBalance: number;
  confidence: number;
  breakdown: {
    category: string;
    amount: number;
    trend: "up" | "down" | "stable";
  }[];
}

export interface FinancialTrend {
  metric: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  period: string;
  insight: string;
}

export interface BudgetForecast {
  categoryId: string;
  categoryName: string;
  currentSpend: number;
  limit: number;
  predictedSpend: number;
  willExceed: boolean;
  daysUntilExceed?: number;
  recommendation: string;
}

export interface CashFlowForecast {
  date: string;
  projectedBalance: number;
  inflows: number;
  outflows: number;
  criticalPoint: boolean;
  warning?: string;
}

/**
 * Прогнозирует доходы и расходы на N месяцев
 */
export async function forecastFinances(
  userId: string,
  monthsAhead: number = 3
): Promise<MonthlyForecast[]> {
  const supabase = await createRSCClient();

  // Получаем историю за последние 12 месяцев
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      direction,
      occurred_at,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .gte("occurred_at", twelveMonthsAgo.toISOString())
    .order("occurred_at");

  if (!transactions || transactions.length < 20) {
    return [{
      month: "Недостаточно данных",
      predictedIncome: 0,
      predictedExpense: 0,
      predictedBalance: 0,
      confidence: 0,
      breakdown: [],
    }];
  }

  // Группируем по месяцам
  const monthlyData = new Map<string, { 
    income: number; 
    expense: number;
    byCategory: Map<string, number>;
  }>();

  transactions.forEach(t => {
    const month = t.occurred_at.substring(0, 7);
    const existing = monthlyData.get(month) || { 
      income: 0, 
      expense: 0,
      byCategory: new Map(),
    };

    const catName = (t.categories as { name?: string } | null)?.name || "Другое";

    if (t.direction === "income") {
      existing.income += t.amount_minor;
    } else {
      existing.expense += Math.abs(t.amount_minor);
      existing.byCategory.set(
        catName, 
        (existing.byCategory.get(catName) || 0) + Math.abs(t.amount_minor)
      );
    }

    monthlyData.set(month, existing);
  });

  const monthlyArray = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Анализируем через Gemini
  const client = getGeminiClient();

  const forecastPrompt = `Создай финансовый прогноз на ${monthsAhead} месяцев.

ИСТОРИЯ ПО МЕСЯЦАМ:
${monthlyArray.map(([month, data]) => {
  const topCategories = Array.from(data.byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ${(amt / 100).toFixed(0)}₽`)
    .join(", ");
  return `${month}: Доходы ${(data.income / 100).toFixed(0)}₽, Расходы ${(data.expense / 100).toFixed(0)}₽ (${topCategories})`;
}).join("\n")}

Проанализируй тренды и создай прогноз. Учти:
1. Сезонность
2. Тренды по категориям
3. Общую динамику

Ответь в формате JSON:
{
  "forecasts": [
    {
      "month": "YYYY-MM",
      "predictedIncome": сумма в копейках,
      "predictedExpense": сумма в копейках,
      "predictedBalance": разница,
      "confidence": 0-100,
      "breakdown": [
        {
          "category": "название",
          "amount": сумма в копейках,
          "trend": "up|down|stable"
        }
      ]
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: forecastPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.forecasts || [];
  } catch (error) {
    logger.error("Finance forecast error:", error);
    return [];
  }
}

/**
 * Определяет финансовые тренды
 */
export async function identifyTrends(
  userId: string
): Promise<FinancialTrend[]> {
  const supabase = await createRSCClient();

  // Получаем данные за 6 месяцев
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      direction,
      occurred_at,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .gte("occurred_at", sixMonthsAgo.toISOString());

  if (!transactions || transactions.length < 10) {
    return [];
  }

  // Разбиваем на две половины для сравнения
  const midDate = new Date();
  midDate.setMonth(midDate.getMonth() - 3);
  const midDateStr = midDate.toISOString();

  const firstHalf = transactions.filter(t => t.occurred_at < midDateStr);
  const secondHalf = transactions.filter(t => t.occurred_at >= midDateStr);

  const calcStats = (txns: typeof transactions) => ({
    income: txns.filter(t => t.direction === "income")
      .reduce((sum, t) => sum + t.amount_minor, 0),
    expense: txns.filter(t => t.direction === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0),
  });

  const first = calcStats(firstHalf);
  const second = calcStats(secondHalf);

  // Анализируем через Gemini
  const client = getGeminiClient();

  const trendPrompt = `Определи финансовые тренды.

ПЕРВЫЙ ПЕРИОД (3 месяца назад):
- Доходы: ${(first.income / 100).toFixed(2)} ₽
- Расходы: ${(first.expense / 100).toFixed(2)} ₽

ВТОРОЙ ПЕРИОД (последние 3 месяца):
- Доходы: ${(second.income / 100).toFixed(2)} ₽
- Расходы: ${(second.expense / 100).toFixed(2)} ₽

Изменения:
- Доходы: ${first.income > 0 ? (((second.income - first.income) / first.income) * 100).toFixed(1) : 0}%
- Расходы: ${first.expense > 0 ? (((second.expense - first.expense) / first.expense) * 100).toFixed(1) : 0}%

Определи ключевые тренды и дай инсайты.

Ответь в формате JSON:
{
  "trends": [
    {
      "metric": "название метрики",
      "direction": "up|down|stable",
      "changePercent": процент изменения,
      "period": "период",
      "insight": "инсайт"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: trendPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.trends || [];
  } catch (error) {
    logger.error("Trend identification error:", error);
    return [];
  }
}

/**
 * Прогнозирует исполнение бюджетов
 */
export async function forecastBudgets(
  userId: string
): Promise<BudgetForecast[]> {
  const supabase = await createRSCClient();

  // Получаем бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!budgets || budgets.length === 0) {
    return [];
  }

  // Получаем расходы за текущий месяц
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, category_id, occurred_at")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", startOfMonth.toISOString());

  // Считаем расходы по категориям
  const spendByCategory = new Map<string, number>();
  transactions?.forEach(t => {
    if (t.category_id) {
      spendByCategory.set(
        t.category_id,
        (spendByCategory.get(t.category_id) || 0) + Math.abs(t.amount_minor)
      );
    }
  });

  // Прогнозируем для каждого бюджета
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  const daysRemaining = daysInMonth - daysPassed;

  const forecasts: BudgetForecast[] = [];

  for (const budget of budgets) {
    const currentSpend = spendByCategory.get(budget.category_id) || 0;
    const dailyRate = daysPassed > 0 ? currentSpend / daysPassed : 0;
    const predictedSpend = currentSpend + (dailyRate * daysRemaining);
    const limit = budget.limit_minor;
    const willExceed = predictedSpend > limit;

    let daysUntilExceed: number | undefined;
    if (dailyRate > 0 && currentSpend < limit) {
      daysUntilExceed = Math.ceil((limit - currentSpend) / dailyRate);
    }

    // Генерируем рекомендацию
    let recommendation = "";
    if (willExceed) {
      const overBy = ((predictedSpend - limit) / 100).toFixed(2);
      recommendation = `Вероятно превышение на ${overBy} ₽. Рекомендуется сократить расходы в этой категории.`;
    } else {
      const remaining = ((limit - predictedSpend) / 100).toFixed(2);
      recommendation = `В рамках бюджета. Останется примерно ${remaining} ₽.`;
    }

    forecasts.push({
      categoryId: budget.category_id,
      categoryName: (budget.categories as { name?: string } | null)?.name || "Категория",
      currentSpend: currentSpend / 100,
      limit: limit / 100,
      predictedSpend: predictedSpend / 100,
      willExceed,
      daysUntilExceed,
      recommendation,
    });
  }

  return forecasts;
}

/**
 * Прогнозирует денежный поток на N дней
 */
export async function forecastCashFlow(
  userId: string,
  daysAhead: number = 30
): Promise<CashFlowForecast[]> {
  const supabase = await createRSCClient();

  // Получаем текущий баланс
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const currentBalance = accounts?.reduce((sum, a) => sum + a.balance, 0) || 0;

  // Получаем историю за 30 дней
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, direction, occurred_at")
    .eq("user_id", userId)
    .gte("occurred_at", thirtyDaysAgo.toISOString());

  // Считаем средние дневные потоки
  const totalInflow = transactions?.filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) || 0;
  const totalOutflow = transactions?.filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) || 0;

  const avgDailyInflow = totalInflow / 30;
  const avgDailyOutflow = totalOutflow / 30;

  // Прогнозируем по дням
  const forecasts: CashFlowForecast[] = [];
  let balance = currentBalance;

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    balance += avgDailyInflow - avgDailyOutflow;

    const isCritical = balance < 0;
    const isWarning = balance < currentBalance * 0.2;

    forecasts.push({
      date: date.toISOString().substring(0, 10),
      projectedBalance: balance / 100,
      inflows: avgDailyInflow / 100,
      outflows: avgDailyOutflow / 100,
      criticalPoint: isCritical,
      warning: isCritical 
        ? "Отрицательный баланс!" 
        : isWarning 
          ? "Низкий баланс" 
          : undefined,
    });
  }

  return forecasts;
}

/**
 * Генерирует AI прогноз с рекомендациями
 */
export async function generateAIForecastReport(
  userId: string
): Promise<string> {
  const [monthlyForecasts, trends, budgetForecasts] = await Promise.all([
    forecastFinances(userId, 3),
    identifyTrends(userId),
    forecastBudgets(userId),
  ]);

  const client = getGeminiClient();

  const reportPrompt = `Создай аналитический отчёт с прогнозами.

ПРОГНОЗ НА 3 МЕСЯЦА:
${monthlyForecasts.map(f => 
  `${f.month}: Доход ${(f.predictedIncome / 100).toFixed(0)}₽, Расход ${(f.predictedExpense / 100).toFixed(0)}₽ (${f.confidence}% уверенность)`
).join("\n")}

ТРЕНДЫ:
${trends.map(t => `- ${t.metric}: ${t.direction} ${t.changePercent}% - ${t.insight}`).join("\n")}

БЮДЖЕТЫ:
${budgetForecasts.map(b => 
  `- ${b.categoryName}: ${b.currentSpend.toFixed(0)}₽ / ${b.limit.toFixed(0)}₽ → прогноз ${b.predictedSpend.toFixed(0)}₽ ${b.willExceed ? "⚠️ ПРЕВЫШЕНИЕ" : "✅"}`
).join("\n")}

Создай структурированный отчёт:
1. 📊 Резюме прогноза
2. 📈 Ключевые тренды
3. ⚠️ Риски и предупреждения
4. 💡 Рекомендации
5. 🎯 Действия на ближайший месяц

Используй эмодзи и форматирование.`;

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: reportPrompt,
  });

  return response.text || "Не удалось создать отчёт.";
}
