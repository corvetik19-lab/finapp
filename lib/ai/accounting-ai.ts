/**
 * AI для бухгалтерии
 * Анализ платежей, аномалии, отчёты, compliance
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface PaymentAnomaly {
  transactionId: string;
  type: "unusual_amount" | "unusual_timing" | "unusual_recipient" | "duplicate" | "pattern_break";
  severity: "low" | "medium" | "high";
  description: string;
  amount: number;
  date: string;
  recommendation: string;
}

export interface ComplianceCheck {
  status: "compliant" | "warning" | "violation";
  score: number;
  issues: Array<{
    category: string;
    severity: "info" | "warning" | "error";
    description: string;
    regulation?: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

export interface FinancialForecast {
  period: string;
  predictedIncome: number;
  predictedExpense: number;
  predictedBalance: number;
  confidence: number;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  risks: string[];
}

/**
 * Обнаруживает аномалии в платежах
 */
export async function detectPaymentAnomalies(
  userId: string,
  period?: { start: string; end: string }
): Promise<PaymentAnomaly[]> {
  const supabase = await createRSCClient();

  // Получаем транзакции
  let query = supabase
    .from("transactions")
    .select(`
      id,
      amount_minor,
      direction,
      occurred_at,
      note,
      category_id,
      account_id,
      supplier_id,
      categories(name),
      accounts(name),
      suppliers(name)
    `)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (period) {
    query = query.gte("occurred_at", period.start).lte("occurred_at", period.end);
  }

  const { data: transactions } = await query;

  if (!transactions || transactions.length < 10) {
    return [];
  }

  // Вычисляем статистику
  const amounts = transactions.map(t => Math.abs(t.amount_minor));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length
  );

  // Анализируем через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй транзакции и найди аномалии.

СТАТИСТИКА:
- Всего транзакций: ${transactions.length}
- Средняя сумма: ${(avgAmount / 100).toFixed(2)} ₽
- Стандартное отклонение: ${(stdDev / 100).toFixed(2)} ₽

ПОСЛЕДНИЕ 30 ТРАНЗАКЦИЙ:
${transactions.slice(0, 30).map(t => `
- ${t.occurred_at}: ${(t.amount_minor / 100).toFixed(2)} ₽
  ${t.direction === "expense" ? "Расход" : "Доход"}
  ${t.note || "без описания"}
  Категория: ${(t.categories as { name?: string } | null)?.name || "нет"}
`).join("\n")}

Найди аномалии:
1. Необычно большие/малые суммы (>3 стандартных отклонения)
2. Необычное время платежей
3. Дубликаты (похожие суммы и даты)
4. Нарушения паттернов

Ответь в формате JSON:
{
  "anomalies": [
    {
      "transactionId": "id",
      "type": "unusual_amount|unusual_timing|duplicate|pattern_break",
      "severity": "low|medium|high",
      "description": "описание",
      "amount": сумма в копейках,
      "date": "дата",
      "recommendation": "рекомендация"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.anomalies || [];
  } catch (error) {
    logger.error("Anomaly detection error:", error);
    return [];
  }
}

/**
 * Проверяет compliance
 */
export async function checkCompliance(
  userId: string,
  companyId?: string
): Promise<ComplianceCheck> {
  const supabase = await createRSCClient();

  // Получаем данные компании
  let company = null;
  if (companyId) {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();
    company = data;
  }

  // Получаем статистику транзакций
  const { data: stats } = await supabase
    .from("transactions")
    .select("direction, amount_minor")
    .eq("user_id", userId)
    .gte("occurred_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const totalIncome = stats?.filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) || 0;
  const totalExpense = stats?.filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) || 0;

  // Получаем транзакции без категорий
  const { count: uncategorizedCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("category_id", null);

  // Анализируем через Gemini
  const client = getGeminiClient();

  const checkPrompt = `Проверь соответствие бухгалтерским требованиям.

КОМПАНИЯ:
${company ? `
- Название: ${company.name}
- ИНН: ${company.inn || "не указан"}
- Тип: ${company.type || "не указан"}
` : "Данные компании не указаны"}

СТАТИСТИКА ЗА 90 ДНЕЙ:
- Доходы: ${(totalIncome / 100).toFixed(2)} ₽
- Расходы: ${(totalExpense / 100).toFixed(2)} ₽
- Транзакций без категории: ${uncategorizedCount || 0}

Проверь:
1. Полнота учёта (все ли транзакции категоризированы)
2. Своевременность отчётности
3. Соответствие налоговым требованиям
4. Документальное оформление

Ответь в формате JSON:
{
  "status": "compliant|warning|violation",
  "score": 0-100,
  "issues": [
    {
      "category": "категория",
      "severity": "info|warning|error",
      "description": "описание",
      "regulation": "регламент/закон",
      "recommendation": "рекомендация"
    }
  ],
  "recommendations": ["рекомендация 1"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: checkPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Compliance check error:", error);
    return {
      status: "warning",
      score: 50,
      issues: [{
        category: "Ошибка проверки",
        severity: "warning",
        description: "Не удалось выполнить проверку",
        recommendation: "Попробуйте позже",
      }],
      recommendations: [],
    };
  }
}

/**
 * Генерирует финансовый прогноз
 */
export async function generateFinancialForecast(
  userId: string,
  forecastMonths: number = 3
): Promise<FinancialForecast[]> {
  const supabase = await createRSCClient();

  // Получаем историю за последние 6 месяцев
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, direction, occurred_at, category_id")
    .eq("user_id", userId)
    .gte("occurred_at", sixMonthsAgo.toISOString())
    .order("occurred_at");

  if (!transactions || transactions.length < 10) {
    return [{
      period: "Недостаточно данных",
      predictedIncome: 0,
      predictedExpense: 0,
      predictedBalance: 0,
      confidence: 0,
      factors: [],
      risks: ["Недостаточно исторических данных для прогноза"],
    }];
  }

  // Группируем по месяцам
  const monthlyData = new Map<string, { income: number; expense: number }>();
  
  transactions.forEach(t => {
    const month = t.occurred_at.substring(0, 7);
    const existing = monthlyData.get(month) || { income: 0, expense: 0 };
    
    if (t.direction === "income") {
      existing.income += t.amount_minor;
    } else {
      existing.expense += Math.abs(t.amount_minor);
    }
    
    monthlyData.set(month, existing);
  });

  const monthlyArray = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Анализируем через Gemini
  const client = getGeminiClient();

  const forecastPrompt = `Создай финансовый прогноз на ${forecastMonths} месяцев.

ИСТОРИЯ ПО МЕСЯЦАМ:
${monthlyArray.map(([month, data]) => 
  `${month}: Доходы ${(data.income / 100).toFixed(2)} ₽, Расходы ${(data.expense / 100).toFixed(2)} ₽`
).join("\n")}

Проанализируй тренды и создай прогноз на следующие ${forecastMonths} месяцев.

Ответь в формате JSON:
{
  "forecasts": [
    {
      "period": "YYYY-MM",
      "predictedIncome": сумма в копейках,
      "predictedExpense": сумма в копейках,
      "predictedBalance": разница,
      "confidence": 0-100,
      "factors": [
        {
          "name": "фактор",
          "impact": "positive|negative|neutral",
          "description": "описание"
        }
      ],
      "risks": ["риск 1"]
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
    logger.error("Forecast error:", error);
    return [];
  }
}

/**
 * Генерирует бухгалтерский отчёт
 */
export async function generateAccountingReport(
  userId: string,
  reportType: "monthly" | "quarterly" | "annual",
  period: { start: string; end: string }
): Promise<string> {
  const supabase = await createRSCClient();

  // Получаем транзакции за период
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
    .gte("occurred_at", period.start)
    .lte("occurred_at", period.end);

  // Группируем по категориям
  const categoryStats = new Map<string, { income: number; expense: number }>();
  let totalIncome = 0;
  let totalExpense = 0;

  transactions?.forEach(t => {
    const categoryName = (t.categories as { name?: string } | null)?.name || "Без категории";
    const existing = categoryStats.get(categoryName) || { income: 0, expense: 0 };
    
    if (t.direction === "income") {
      existing.income += t.amount_minor;
      totalIncome += t.amount_minor;
    } else {
      existing.expense += Math.abs(t.amount_minor);
      totalExpense += Math.abs(t.amount_minor);
    }
    
    categoryStats.set(categoryName, existing);
  });

  // Генерируем отчёт через Gemini
  const client = getGeminiClient();

  const reportTypeLabel = {
    monthly: "Ежемесячный",
    quarterly: "Квартальный",
    annual: "Годовой",
  }[reportType];

  const reportPrompt = `Создай ${reportTypeLabel} бухгалтерский отчёт.

ПЕРИОД: ${period.start} - ${period.end}

ИТОГИ:
- Всего доходов: ${(totalIncome / 100).toFixed(2)} ₽
- Всего расходов: ${(totalExpense / 100).toFixed(2)} ₽
- Чистый результат: ${((totalIncome - totalExpense) / 100).toFixed(2)} ₽
- Количество транзакций: ${transactions?.length || 0}

ПО КАТЕГОРИЯМ:
${Array.from(categoryStats.entries()).map(([name, stats]) => 
  `- ${name}: Доходы ${(stats.income / 100).toFixed(2)} ₽, Расходы ${(stats.expense / 100).toFixed(2)} ₽`
).join("\n")}

Создай структурированный отчёт:
1. 📋 Резюме периода
2. 💰 Доходы (детализация)
3. 💸 Расходы (детализация)
4. 📊 Анализ по категориям
5. 📈 Динамика и тренды
6. 💡 Выводы и рекомендации

Используй таблицы, эмодзи и форматирование.`;

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: reportPrompt,
  });

  return response.text || "Не удалось создать отчёт.";
}

/**
 * Анализирует кэш-флоу
 */
export async function analyzeCashFlow(
  userId: string,
  period: { start: string; end: string }
): Promise<{
  summary: {
    openingBalance: number;
    closingBalance: number;
    netCashFlow: number;
    operatingCashFlow: number;
  };
  byWeek: Array<{
    week: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
  insights: string[];
  recommendations: string[];
}> {
  const supabase = await createRSCClient();

  // Получаем транзакции
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, direction, occurred_at")
    .eq("user_id", userId)
    .gte("occurred_at", period.start)
    .lte("occurred_at", period.end)
    .order("occurred_at");

  if (!transactions || transactions.length === 0) {
    return {
      summary: { openingBalance: 0, closingBalance: 0, netCashFlow: 0, operatingCashFlow: 0 },
      byWeek: [],
      insights: ["Нет данных за период"],
      recommendations: [],
    };
  }

  // Группируем по неделям
  const weeklyData = new Map<string, { inflow: number; outflow: number }>();
  
  transactions.forEach(t => {
    const date = new Date(t.occurred_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().substring(0, 10);
    
    const existing = weeklyData.get(weekKey) || { inflow: 0, outflow: 0 };
    
    if (t.direction === "income") {
      existing.inflow += t.amount_minor;
    } else {
      existing.outflow += Math.abs(t.amount_minor);
    }
    
    weeklyData.set(weekKey, existing);
  });

  const byWeek = Array.from(weeklyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, data]) => ({
      week,
      inflow: data.inflow / 100,
      outflow: data.outflow / 100,
      net: (data.inflow - data.outflow) / 100,
    }));

  const totalInflow = byWeek.reduce((sum, w) => sum + w.inflow, 0);
  const totalOutflow = byWeek.reduce((sum, w) => sum + w.outflow, 0);

  // Анализируем через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй кэш-флоу.

ДАННЫЕ ПО НЕДЕЛЯМ:
${byWeek.map(w => `${w.week}: +${w.inflow.toFixed(2)} / -${w.outflow.toFixed(2)} = ${w.net.toFixed(2)}`).join("\n")}

ИТОГО:
- Приток: ${totalInflow.toFixed(2)} ₽
- Отток: ${totalOutflow.toFixed(2)} ₽
- Чистый поток: ${(totalInflow - totalOutflow).toFixed(2)} ₽

Дай инсайты и рекомендации.

Ответь в формате JSON:
{
  "insights": ["инсайт 1"],
  "recommendations": ["рекомендация 1"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");

    return {
      summary: {
        openingBalance: 0,
        closingBalance: (totalInflow - totalOutflow) * 100,
        netCashFlow: (totalInflow - totalOutflow) * 100,
        operatingCashFlow: (totalInflow - totalOutflow) * 100,
      },
      byWeek,
      insights: result.insights || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    logger.error("Cash flow analysis error:", error);
    return {
      summary: {
        openingBalance: 0,
        closingBalance: (totalInflow - totalOutflow) * 100,
        netCashFlow: (totalInflow - totalOutflow) * 100,
        operatingCashFlow: (totalInflow - totalOutflow) * 100,
      },
      byWeek,
      insights: [],
      recommendations: [],
    };
  }
}

/**
 * Оптимизирует налоговую нагрузку
 */
export async function suggestTaxOptimization(
  userId: string,
  year: number
): Promise<{
  currentTaxEstimate: number;
  potentialSavings: number;
  suggestions: Array<{
    title: string;
    description: string;
    potentialSaving: number;
    difficulty: "easy" | "medium" | "hard";
    legalBasis?: string;
  }>;
  warnings: string[];
}> {
  const supabase = await createRSCClient();

  // Получаем данные за год
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_minor, direction, category_id, categories(name, kind)")
    .eq("user_id", userId)
    .gte("occurred_at", startOfYear)
    .lte("occurred_at", endOfYear);

  const totalIncome = transactions?.filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) || 0;
  const totalExpense = transactions?.filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) || 0;

  // Анализируем через Gemini
  const client = getGeminiClient();

  const taxPrompt = `Предложи способы оптимизации налогов.

ДАННЫЕ ЗА ${year} ГОД:
- Доходы: ${(totalIncome / 100).toFixed(2)} ₽
- Расходы: ${(totalExpense / 100).toFixed(2)} ₽
- Налогооблагаемая база (приблизительно): ${((totalIncome - totalExpense) / 100).toFixed(2)} ₽

Предложи легальные способы оптимизации налогов для ИП/ООО в России.

Ответь в формате JSON:
{
  "currentTaxEstimate": примерная сумма налога в копейках,
  "potentialSavings": возможная экономия в копейках,
  "suggestions": [
    {
      "title": "название",
      "description": "описание",
      "potentialSaving": сумма в копейках,
      "difficulty": "easy|medium|hard",
      "legalBasis": "правовое основание"
    }
  ],
  "warnings": ["предупреждение"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: taxPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Tax optimization error:", error);
    return {
      currentTaxEstimate: 0,
      potentialSavings: 0,
      suggestions: [],
      warnings: ["Не удалось проанализировать данные"],
    };
  }
}
