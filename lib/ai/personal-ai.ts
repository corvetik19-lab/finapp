/**
 * AI для личного режима
 * Персональный ассистент, заметки, голосовой ввод
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { createEmbedding } from "./embeddings";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface PersonalInsight {
  type: "spending" | "saving" | "goal" | "habit" | "reminder";
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
  priority: "low" | "medium" | "high";
}

export interface GoalProgress {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  estimatedCompletion: string;
  recommendations: string[];
  onTrack: boolean;
}

export interface SmartReminder {
  type: "bill" | "subscription" | "goal" | "budget" | "custom";
  title: string;
  description: string;
  dueDate: string;
  amount?: number;
  recurring: boolean;
  priority: "low" | "medium" | "high";
}

/**
 * Генерирует персональные инсайты
 */
export async function generatePersonalInsights(
  userId: string
): Promise<PersonalInsight[]> {
  const supabase = await createRSCClient();

  // Получаем данные пользователя
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      direction,
      occurred_at,
      category_id,
      categories(name, kind)
    `)
    .eq("user_id", userId)
    .gte("occurred_at", thirtyDaysAgo.toISOString())
    .order("occurred_at", { ascending: false });

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Считаем статистику
  const totalIncome = transactions?.filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) || 0;
  const totalExpense = transactions?.filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) || 0;

  // Группируем расходы по категориям
  const expensesByCategory = new Map<string, number>();
  transactions?.filter(t => t.direction === "expense").forEach(t => {
    const catName = (t.categories as { name?: string } | null)?.name || "Без категории";
    expensesByCategory.set(catName, (expensesByCategory.get(catName) || 0) + Math.abs(t.amount_minor));
  });

  // Анализируем через Gemini
  const client = getGeminiClient();

  const insightPrompt = `Сгенерируй персональные финансовые инсайты.

ДАННЫЕ ЗА 30 ДНЕЙ:
- Доходы: ${(totalIncome / 100).toFixed(2)} ₽
- Расходы: ${(totalExpense / 100).toFixed(2)} ₽
- Экономия: ${((totalIncome - totalExpense) / 100).toFixed(2)} ₽

РАСХОДЫ ПО КАТЕГОРИЯМ:
${Array.from(expensesByCategory.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([cat, amount]) => `- ${cat}: ${(amount / 100).toFixed(2)} ₽`)
  .join("\n")}

БЮДЖЕТЫ: ${budgets?.length || 0}
ЦЕЛИ: ${plans?.length || 0}

Сгенерируй 3-5 полезных инсайтов:
1. Паттерны трат
2. Возможности экономии
3. Прогресс по целям
4. Напоминания
5. Советы

Ответь в формате JSON:
{
  "insights": [
    {
      "type": "spending|saving|goal|habit|reminder",
      "title": "заголовок",
      "description": "описание",
      "actionable": true/false,
      "action": "действие",
      "priority": "low|medium|high"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: insightPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.insights || [];
  } catch (error) {
    logger.error("Personal insights error:", error);
    return [];
  }
}

/**
 * Анализирует прогресс по целям
 */
export async function analyzeGoalProgress(
  userId: string
): Promise<GoalProgress[]> {
  const supabase = await createRSCClient();

  const { data: plans } = await supabase
    .from("plans")
    .select("*, plan_topups(*)")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!plans || plans.length === 0) {
    return [];
  }

  const client = getGeminiClient();
  const results: GoalProgress[] = [];

  for (const plan of plans) {
    const currentAmount = plan.plan_topups?.reduce(
      (sum: number, t: { amount_minor: number }) => sum + t.amount_minor, 
      0
    ) || 0;
    const targetAmount = plan.target_amount || 0;
    const progressPercent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

    // Оцениваем дату завершения
    const startDate = new Date(plan.created_at);
    const now = new Date();
    const daysPassed = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = currentAmount / daysPassed;
    const remaining = targetAmount - currentAmount;
    const daysToComplete = dailyRate > 0 ? remaining / dailyRate : Infinity;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);

    const analysisPrompt = `Проанализируй прогресс цели.

ЦЕЛЬ: ${plan.name}
- Целевая сумма: ${(targetAmount / 100).toFixed(2)} ₽
- Накоплено: ${(currentAmount / 100).toFixed(2)} ₽
- Прогресс: ${progressPercent.toFixed(1)}%
- Дней прошло: ${Math.round(daysPassed)}
- Средняя скорость: ${(dailyRate / 100).toFixed(2)} ₽/день

Дай 2-3 рекомендации для достижения цели.

Ответь в формате JSON:
{
  "onTrack": true/false,
  "recommendations": ["рекомендация 1"]
}`;

    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODELS.FAST,
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");

      results.push({
        goalId: plan.id,
        goalName: plan.name,
        targetAmount: targetAmount / 100,
        currentAmount: currentAmount / 100,
        progressPercent,
        estimatedCompletion: daysToComplete < 365 * 10 
          ? estimatedDate.toISOString().substring(0, 10)
          : "Неопределено",
        recommendations: result.recommendations || [],
        onTrack: result.onTrack ?? progressPercent > 0,
      });
    } catch {
      results.push({
        goalId: plan.id,
        goalName: plan.name,
        targetAmount: targetAmount / 100,
        currentAmount: currentAmount / 100,
        progressPercent,
        estimatedCompletion: "Неопределено",
        recommendations: [],
        onTrack: progressPercent > 0,
      });
    }
  }

  return results;
}

/**
 * Генерирует умные напоминания
 */
export async function generateSmartReminders(
  userId: string
): Promise<SmartReminder[]> {
  const supabase = await createRSCClient();

  // Получаем регулярные платежи
  const { data: recurringTxns } = await supabase
    .from("transactions")
    .select("note, amount_minor, occurred_at, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .order("occurred_at", { ascending: false })
    .limit(100);

  // Получаем бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Получаем цели
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Ищем повторяющиеся платежи (подписки)
  const paymentPatterns = new Map<string, { amount: number; dates: string[] }>();
  
  recurringTxns?.forEach((t: { note: string | null; amount_minor: number; occurred_at: string }) => {
    const key = `${t.note || ""}:${t.amount_minor}`;
    const existing = paymentPatterns.get(key) || { amount: t.amount_minor, dates: [] as string[] };
    existing.dates.push(t.occurred_at);
    paymentPatterns.set(key, existing);
  });

  // Фильтруем повторяющиеся (минимум 2 раза)
  const subscriptions = Array.from(paymentPatterns.entries())
    .filter(([, v]) => v.dates.length >= 2)
    .map(([k, v]) => ({
      name: k.split(":")[0] || "Подписка",
      amount: v.amount,
      lastDate: v.dates[0],
    }));

  // Анализируем через Gemini
  const client = getGeminiClient();

  const reminderPrompt = `Сгенерируй умные напоминания.

ПОДПИСКИ/РЕГУЛЯРНЫЕ ПЛАТЕЖИ:
${subscriptions.slice(0, 10).map(s => 
  `- ${s.name}: ${(s.amount / 100).toFixed(2)} ₽ (последний: ${s.lastDate.substring(0, 10)})`
).join("\n") || "Нет данных"}

БЮДЖЕТЫ:
${budgets?.map(b => 
  `- ${(b.categories as { name?: string } | null)?.name || "Бюджет"}: лимит ${(b.limit_minor / 100).toFixed(2)} ₽`
).join("\n") || "Нет бюджетов"}

ЦЕЛИ:
${plans?.map(p => `- ${p.name}: ${(p.target_amount / 100).toFixed(2)} ₽`).join("\n") || "Нет целей"}

Сгенерируй 3-5 напоминаний о предстоящих платежах, бюджетах и целях.

Ответь в формате JSON:
{
  "reminders": [
    {
      "type": "bill|subscription|goal|budget|custom",
      "title": "заголовок",
      "description": "описание",
      "dueDate": "YYYY-MM-DD",
      "amount": сумма в копейках или null,
      "recurring": true/false,
      "priority": "low|medium|high"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: reminderPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.reminders || [];
  } catch (error) {
    logger.error("Smart reminders error:", error);
    return [];
  }
}

/**
 * Умный поиск по заметкам и транзакциям
 */
export async function smartSearch(
  query: string,
  userId: string
): Promise<{
  transactions: Array<{
    id: string;
    note: string;
    amount: number;
    date: string;
    relevance: number;
  }>;
  insights: string[];
}> {
  const supabase = await createRSCClient();

  // Создаём embedding для запроса
  const queryEmbedding = await createEmbedding(query);

  // Ищем по транзакциям с embeddings
  const { data: matches } = await supabase.rpc("match_transactions", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 10,
    filter_user_id: userId,
  });

  const transactions = (matches || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    note: (m.note as string) || "",
    amount: (m.amount_minor as number) / 100,
    date: m.occurred_at as string,
    relevance: m.similarity as number,
  }));

  // Генерируем инсайты по найденному
  if (transactions.length > 0) {
    const client = getGeminiClient();

    const insightPrompt = `Пользователь искал: "${query}"

Найденные транзакции:
${transactions.map((t: { date: string; note: string; amount: number }) => `- ${t.date}: ${t.note} - ${t.amount} ₽`).join("\n")}

Дай 1-2 полезных инсайта на основе найденного.

Ответь в формате JSON:
{
  "insights": ["инсайт 1"]
}`;

    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODELS.FAST,
        contents: insightPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");
      return { transactions, insights: result.insights || [] };
    } catch {
      return { transactions, insights: [] };
    }
  }

  return { transactions: [], insights: ["По запросу ничего не найдено"] };
}

/**
 * Генерирует персональный финансовый план
 */
export async function generatePersonalFinancePlan(
  userId: string,
  goals: string[]
): Promise<{
  plan: Array<{
    month: string;
    actions: string[];
    targetSavings: number;
    milestones: string[];
  }>;
  summary: string;
  tips: string[];
}> {
  const supabase = await createRSCClient();

  // Получаем финансовую статистику
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, direction")
    .eq("user_id", userId)
    .gte("occurred_at", thirtyDaysAgo.toISOString());

  const avgIncome = (transactions?.filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) || 0) / 100;
  const avgExpense = (transactions?.filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) || 0) / 100;

  const client = getGeminiClient();

  const planPrompt = `Создай персональный финансовый план на 6 месяцев.

ТЕКУЩИЕ ФИНАНСЫ (за месяц):
- Средний доход: ${avgIncome.toFixed(2)} ₽
- Средние расходы: ${avgExpense.toFixed(2)} ₽
- Возможная экономия: ${(avgIncome - avgExpense).toFixed(2)} ₽

ЦЕЛИ ПОЛЬЗОВАТЕЛЯ:
${goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}

Создай пошаговый план на 6 месяцев с конкретными действиями.

Ответь в формате JSON:
{
  "plan": [
    {
      "month": "Месяц 1",
      "actions": ["действие 1"],
      "targetSavings": сумма,
      "milestones": ["milestone 1"]
    }
  ],
  "summary": "краткое резюме плана",
  "tips": ["совет 1"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: planPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Finance plan error:", error);
    return {
      plan: [],
      summary: "Не удалось создать план",
      tips: [],
    };
  }
}

/**
 * Анализирует привычки трат
 */
export async function analyzeSpendingHabits(
  userId: string
): Promise<{
  habits: Array<{
    name: string;
    type: "good" | "bad" | "neutral";
    frequency: string;
    impact: number;
    suggestion?: string;
  }>;
  patterns: Array<{
    pattern: string;
    description: string;
  }>;
  score: number;
}> {
  const supabase = await createRSCClient();

  // Получаем транзакции за 90 дней
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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
    .eq("direction", "expense")
    .gte("occurred_at", ninetyDaysAgo.toISOString())
    .order("occurred_at");

  if (!transactions || transactions.length < 10) {
    return {
      habits: [],
      patterns: [],
      score: 50,
    };
  }

  // Группируем по категориям и дням недели
  const byCategory = new Map<string, number[]>();
  const byDayOfWeek = new Map<number, number>();

  transactions.forEach(t => {
    const cat = (t.categories as { name?: string } | null)?.name || "Другое";
    const amounts = byCategory.get(cat) || [];
    amounts.push(Math.abs(t.amount_minor));
    byCategory.set(cat, amounts);

    const day = new Date(t.occurred_at).getDay();
    byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + Math.abs(t.amount_minor));
  });

  const client = getGeminiClient();

  const habitsPrompt = `Проанализируй привычки трат.

РАСХОДЫ ПО КАТЕГОРИЯМ (за 90 дней):
${Array.from(byCategory.entries()).map(([cat, amounts]) => 
  `- ${cat}: ${amounts.length} транзакций, всего ${(amounts.reduce((a, b) => a + b, 0) / 100).toFixed(2)} ₽`
).join("\n")}

РАСХОДЫ ПО ДНЯМ НЕДЕЛИ:
${Array.from(byDayOfWeek.entries())
  .sort((a, b) => a[0] - b[0])
  .map(([day, amount]) => {
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return `- ${days[day]}: ${(amount / 100).toFixed(2)} ₽`;
  }).join("\n")}

Определи привычки и паттерны трат.

Ответь в формате JSON:
{
  "habits": [
    {
      "name": "название привычки",
      "type": "good|bad|neutral",
      "frequency": "частота",
      "impact": влияние в копейках,
      "suggestion": "совет"
    }
  ],
  "patterns": [
    {
      "pattern": "паттерн",
      "description": "описание"
    }
  ],
  "score": 0-100
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: habitsPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Spending habits error:", error);
    return { habits: [], patterns: [], score: 50 };
  }
}
