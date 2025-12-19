/**
 * AI Анализ расходов
 * Детальный анализ, паттерны, оптимизация
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface ExpenseBreakdown {
  total: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percent: number;
    trend: "up" | "down" | "stable";
    changePercent: number;
  }>;
  byPeriod: Array<{
    period: string;
    amount: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

export interface SpendingPattern {
  pattern: string;
  description: string;
  frequency: string;
  avgAmount: number;
  impact: "positive" | "negative" | "neutral";
  suggestion?: string;
}

export interface OptimizationSuggestion {
  category: string;
  currentSpend: number;
  suggestedSpend: number;
  savingsPotential: number;
  difficulty: "easy" | "medium" | "hard";
  actions: string[];
}

export interface ExpenseComparison {
  period1: { label: string; total: number };
  period2: { label: string; total: number };
  change: number;
  changePercent: number;
  categoryChanges: Array<{
    category: string;
    period1Amount: number;
    period2Amount: number;
    change: number;
  }>;
  insights: string[];
}

/**
 * Анализирует расходы за период
 */
export async function analyzeExpenses(
  userId: string,
  period: { start: string; end: string }
): Promise<ExpenseBreakdown> {
  const supabase = await createRSCClient();

  // Получаем расходы за период
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id,
      amount_minor,
      occurred_at,
      note,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", period.start)
    .lte("occurred_at", period.end)
    .order("amount_minor", { ascending: true }); // DESC по модулю

  if (!transactions || transactions.length === 0) {
    return {
      total: 0,
      byCategory: [],
      byPeriod: [],
      topExpenses: [],
    };
  }

  // Считаем общую сумму
  const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount_minor), 0);

  // Группируем по категориям
  const categoryMap = new Map<string, { name: string; amount: number }>();
  transactions.forEach(t => {
    const catId = t.category_id || "uncategorized";
    const catName = (t.categories as { name?: string } | null)?.name || "Без категории";
    const existing = categoryMap.get(catId) || { name: catName, amount: 0 };
    existing.amount += Math.abs(t.amount_minor);
    categoryMap.set(catId, existing);
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      amount: data.amount / 100,
      percent: (data.amount / total) * 100,
      trend: "stable" as const,
      changePercent: 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Группируем по неделям
  const weekMap = new Map<string, number>();
  transactions.forEach(t => {
    const date = new Date(t.occurred_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().substring(0, 10);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + Math.abs(t.amount_minor));
  });

  const byPeriod = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, amount]) => ({ period, amount: amount / 100 }));

  // Топ расходы
  const topExpenses = transactions
    .sort((a, b) => Math.abs(b.amount_minor) - Math.abs(a.amount_minor))
    .slice(0, 10)
    .map(t => ({
      description: t.note || "Без описания",
      amount: Math.abs(t.amount_minor) / 100,
      date: t.occurred_at,
      category: (t.categories as { name?: string } | null)?.name || "Без категории",
    }));

  return {
    total: total / 100,
    byCategory,
    byPeriod,
    topExpenses,
  };
}

/**
 * Определяет паттерны трат
 */
export async function identifySpendingPatterns(
  userId: string
): Promise<SpendingPattern[]> {
  const supabase = await createRSCClient();

  // Получаем расходы за 90 дней
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      occurred_at,
      note,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", ninetyDaysAgo.toISOString())
    .order("occurred_at");

  if (!transactions || transactions.length < 20) {
    return [];
  }

  // Анализируем по дням недели
  const byDayOfWeek = new Map<number, number>();
  const byHour = new Map<number, number>();
  const byCategory = new Map<string, { count: number; total: number }>();

  transactions.forEach(t => {
    const date = new Date(t.occurred_at);
    const day = date.getDay();
    const hour = date.getHours();
    const cat = (t.categories as { name?: string } | null)?.name || "Другое";

    byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + Math.abs(t.amount_minor));
    byHour.set(hour, (byHour.get(hour) || 0) + Math.abs(t.amount_minor));
    
    const catData = byCategory.get(cat) || { count: 0, total: 0 };
    catData.count++;
    catData.total += Math.abs(t.amount_minor);
    byCategory.set(cat, catData);
  });

  // Анализируем через Gemini
  const client = getGeminiClient();

  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const patternPrompt = `Определи паттерны трат.

РАСХОДЫ ПО ДНЯМ НЕДЕЛИ:
${Array.from(byDayOfWeek.entries())
  .sort((a, b) => a[0] - b[0])
  .map(([day, amount]) => `${days[day]}: ${(amount / 100).toFixed(0)} ₽`)
  .join("\n")}

РАСХОДЫ ПО ВРЕМЕНИ СУТОК:
${Array.from(byHour.entries())
  .sort((a, b) => a[0] - b[0])
  .filter(([, amount]) => amount > 0)
  .map(([hour, amount]) => `${hour}:00: ${(amount / 100).toFixed(0)} ₽`)
  .join("\n")}

ПО КАТЕГОРИЯМ (частота и сумма):
${Array.from(byCategory.entries())
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .map(([cat, data]) => `${cat}: ${data.count} раз, ${(data.total / 100).toFixed(0)} ₽`)
  .join("\n")}

Определи 3-5 ключевых паттернов.

Ответь в формате JSON:
{
  "patterns": [
    {
      "pattern": "название паттерна",
      "description": "описание",
      "frequency": "частота",
      "avgAmount": средняя сумма в копейках,
      "impact": "positive|negative|neutral",
      "suggestion": "совет"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: patternPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.patterns || [];
  } catch (error) {
    logger.error("Spending patterns error:", error);
    return [];
  }
}

/**
 * Предлагает оптимизацию расходов
 */
export async function suggestOptimizations(
  userId: string
): Promise<OptimizationSuggestion[]> {
  const supabase = await createRSCClient();

  // Получаем расходы за 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", threeMonthsAgo.toISOString());

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Группируем по категориям (среднемесячно)
  const categorySpend = new Map<string, { name: string; total: number }>();
  transactions.forEach(t => {
    const catId = t.category_id || "other";
    const catName = (t.categories as { name?: string } | null)?.name || "Другое";
    const existing = categorySpend.get(catId) || { name: catName, total: 0 };
    existing.total += Math.abs(t.amount_minor);
    categorySpend.set(catId, existing);
  });

  // Среднемесячные расходы
  const monthlySpend = Array.from(categorySpend.entries()).map(([id, data]) => ({
    categoryId: id,
    categoryName: data.name,
    monthlyAvg: data.total / 3 / 100,
  }));

  // Анализируем через Gemini
  const client = getGeminiClient();

  const optimizePrompt = `Предложи оптимизацию расходов.

СРЕДНЕМЕСЯЧНЫЕ РАСХОДЫ ПО КАТЕГОРИЯМ:
${monthlySpend
  .sort((a, b) => b.monthlyAvg - a.monthlyAvg)
  .map(c => `- ${c.categoryName}: ${c.monthlyAvg.toFixed(0)} ₽/мес`)
  .join("\n")}

ОБЩИЕ МЕСЯЧНЫЕ РАСХОДЫ: ${monthlySpend.reduce((s, c) => s + c.monthlyAvg, 0).toFixed(0)} ₽

Предложи конкретные способы оптимизации для каждой крупной категории.

Ответь в формате JSON:
{
  "suggestions": [
    {
      "category": "категория",
      "currentSpend": текущие расходы в копейках,
      "suggestedSpend": рекомендуемые расходы в копейках,
      "savingsPotential": потенциал экономии в копейках,
      "difficulty": "easy|medium|hard",
      "actions": ["действие 1", "действие 2"]
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: optimizePrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.suggestions || [];
  } catch (error) {
    logger.error("Optimization suggestions error:", error);
    return [];
  }
}

/**
 * Сравнивает расходы между периодами
 */
export async function compareExpenses(
  userId: string,
  period1: { start: string; end: string; label: string },
  period2: { start: string; end: string; label: string }
): Promise<ExpenseComparison> {
  const supabase = await createRSCClient();

  // Получаем расходы за оба периода
  const { data: txns1 } = await supabase
    .from("transactions")
    .select("amount_minor, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", period1.start)
    .lte("occurred_at", period1.end);

  const { data: txns2 } = await supabase
    .from("transactions")
    .select("amount_minor, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", period2.start)
    .lte("occurred_at", period2.end);

  // Считаем тотали
  const total1 = (txns1 || []).reduce((s, t) => s + Math.abs(t.amount_minor), 0);
  const total2 = (txns2 || []).reduce((s, t) => s + Math.abs(t.amount_minor), 0);

  // Группируем по категориям
  const cat1 = new Map<string, number>();
  const cat2 = new Map<string, number>();

  (txns1 || []).forEach(t => {
    const cat = (t.categories as { name?: string } | null)?.name || "Другое";
    cat1.set(cat, (cat1.get(cat) || 0) + Math.abs(t.amount_minor));
  });

  (txns2 || []).forEach(t => {
    const cat = (t.categories as { name?: string } | null)?.name || "Другое";
    cat2.set(cat, (cat2.get(cat) || 0) + Math.abs(t.amount_minor));
  });

  // Собираем все категории
  const allCategories = new Set([...cat1.keys(), ...cat2.keys()]);
  const categoryChanges = Array.from(allCategories).map(cat => ({
    category: cat,
    period1Amount: (cat1.get(cat) || 0) / 100,
    period2Amount: (cat2.get(cat) || 0) / 100,
    change: ((cat2.get(cat) || 0) - (cat1.get(cat) || 0)) / 100,
  })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Генерируем инсайты через Gemini
  const client = getGeminiClient();

  const comparePrompt = `Сравни расходы между периодами.

ПЕРИОД 1 (${period1.label}): ${(total1 / 100).toFixed(0)} ₽
ПЕРИОД 2 (${period2.label}): ${(total2 / 100).toFixed(0)} ₽
ИЗМЕНЕНИЕ: ${((total2 - total1) / 100).toFixed(0)} ₽ (${total1 > 0 ? (((total2 - total1) / total1) * 100).toFixed(1) : 0}%)

ИЗМЕНЕНИЯ ПО КАТЕГОРИЯМ:
${categoryChanges.slice(0, 10).map(c => 
  `- ${c.category}: ${c.period1Amount.toFixed(0)} → ${c.period2Amount.toFixed(0)} ₽ (${c.change > 0 ? "+" : ""}${c.change.toFixed(0)})`
).join("\n")}

Дай 3-5 инсайтов о сравнении.

Ответь в формате JSON:
{
  "insights": ["инсайт 1", "инсайт 2"]
}`;

  let insights: string[] = [];
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FAST,
      contents: comparePrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    insights = result.insights || [];
  } catch (error) {
    logger.error("Expense comparison error:", error);
  }

  return {
    period1: { label: period1.label, total: total1 / 100 },
    period2: { label: period2.label, total: total2 / 100 },
    change: (total2 - total1) / 100,
    changePercent: total1 > 0 ? ((total2 - total1) / total1) * 100 : 0,
    categoryChanges,
    insights,
  };
}

/**
 * Генерирует AI отчёт по расходам
 */
export async function generateExpenseReport(
  userId: string,
  period: { start: string; end: string }
): Promise<string> {
  const breakdown = await analyzeExpenses(userId, period);
  const patterns = await identifySpendingPatterns(userId);
  const optimizations = await suggestOptimizations(userId);

  const client = getGeminiClient();

  const reportPrompt = `Создай детальный отчёт по расходам.

ПЕРИОД: ${period.start} - ${period.end}
ОБЩИЕ РАСХОДЫ: ${breakdown.total.toFixed(2)} ₽

ПО КАТЕГОРИЯМ:
${breakdown.byCategory.map(c => 
  `- ${c.categoryName}: ${c.amount.toFixed(0)} ₽ (${c.percent.toFixed(1)}%)`
).join("\n")}

ТОП-5 РАСХОДОВ:
${breakdown.topExpenses.slice(0, 5).map(e => 
  `- ${e.date.substring(0, 10)}: ${e.description} - ${e.amount.toFixed(0)} ₽ (${e.category})`
).join("\n")}

ПАТТЕРНЫ:
${patterns.map(p => `- ${p.pattern}: ${p.description}`).join("\n")}

ВОЗМОЖНОСТИ ОПТИМИЗАЦИИ:
${optimizations.map(o => 
  `- ${o.category}: экономия до ${(o.savingsPotential / 100).toFixed(0)} ₽`
).join("\n")}

Создай структурированный отчёт:
1. 📊 Обзор расходов
2. 📈 Структура по категориям
3. 🔍 Крупнейшие траты
4. 🔄 Выявленные паттерны
5. 💡 Рекомендации по оптимизации
6. 🎯 План действий

Используй таблицы, эмодзи и форматирование.`;

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: reportPrompt,
  });

  return response.text || "Не удалось создать отчёт.";
}
