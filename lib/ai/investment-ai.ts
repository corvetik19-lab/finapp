/**
 * AI для инвестиций
 * Анализ портфеля, прогнозы, диверсификация
 */

import { getGeminiClient, GEMINI_MODELS } from "./openrouter-compat";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  returnPercent: number;
  diversification: {
    score: number;
    byAssetClass: Record<string, number>;
    byIndustry: Record<string, number>;
    byCurrency: Record<string, number>;
  };
  riskLevel: "conservative" | "moderate" | "aggressive";
  riskScore: number;
  topPerformers: Array<{
    name: string;
    return: number;
    returnPercent: number;
  }>;
  underperformers: Array<{
    name: string;
    return: number;
    returnPercent: number;
  }>;
  recommendations: string[];
}

export interface InvestmentRecommendation {
  action: "buy" | "sell" | "hold" | "rebalance";
  asset?: string;
  reason: string;
  confidence: number;
  expectedReturn?: number;
  riskLevel: "low" | "medium" | "high";
  timeHorizon: string;
}

export interface MarketInsight {
  trend: "bullish" | "bearish" | "neutral";
  summary: string;
  keyFactors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  sectors: Array<{
    name: string;
    outlook: "positive" | "negative" | "neutral";
    reason: string;
  }>;
  risks: string[];
  opportunities: string[];
}

/**
 * Анализирует инвестиционный портфель
 */
export async function analyzePortfolio(
  userId: string
): Promise<PortfolioAnalysis> {
  const supabase = await createRSCClient();

  // Получаем инвестиции пользователя
  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!investments || investments.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalReturn: 0,
      returnPercent: 0,
      diversification: {
        score: 0,
        byAssetClass: {},
        byIndustry: {},
        byCurrency: {},
      },
      riskLevel: "moderate",
      riskScore: 50,
      topPerformers: [],
      underperformers: [],
      recommendations: ["Начните инвестировать для формирования портфеля"],
    };
  }

  // Считаем базовую статистику
  let totalValue = 0;
  let totalCost = 0;
  const byAssetClass: Record<string, number> = {};
  const byIndustry: Record<string, number> = {};
  const byCurrency: Record<string, number> = {};

  const returns: Array<{
    name: string;
    return: number;
    returnPercent: number;
  }> = [];

  investments.forEach(inv => {
    const currentValue = inv.current_value || inv.purchase_price * inv.quantity;
    const cost = inv.purchase_price * inv.quantity;
    
    totalValue += currentValue;
    totalCost += cost;

    const returnAmount = currentValue - cost;
    const returnPct = cost > 0 ? (returnAmount / cost) * 100 : 0;

    returns.push({
      name: inv.name,
      return: returnAmount / 100,
      returnPercent: returnPct,
    });

    // Группировка
    const assetClass = inv.asset_class || "other";
    const industry = inv.industry || "other";
    const currency = inv.currency || "RUB";

    byAssetClass[assetClass] = (byAssetClass[assetClass] || 0) + currentValue;
    byIndustry[industry] = (byIndustry[industry] || 0) + currentValue;
    byCurrency[currency] = (byCurrency[currency] || 0) + currentValue;
  });

  // Сортируем по доходности
  returns.sort((a, b) => b.returnPercent - a.returnPercent);

  const topPerformers = returns.slice(0, 3);
  const underperformers = returns.slice(-3).reverse();

  // Анализируем через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй инвестиционный портфель.

ПОРТФЕЛЬ:
- Общая стоимость: ${(totalValue / 100).toFixed(2)} ₽
- Общие затраты: ${(totalCost / 100).toFixed(2)} ₽
- Общая доходность: ${((totalValue - totalCost) / 100).toFixed(2)} ₽ (${((totalValue - totalCost) / totalCost * 100).toFixed(2)}%)

РАСПРЕДЕЛЕНИЕ ПО КЛАССАМ АКТИВОВ:
${Object.entries(byAssetClass).map(([k, v]) => `- ${k}: ${(v / totalValue * 100).toFixed(1)}%`).join("\n")}

РАСПРЕДЕЛЕНИЕ ПО ОТРАСЛЯМ:
${Object.entries(byIndustry).map(([k, v]) => `- ${k}: ${(v / totalValue * 100).toFixed(1)}%`).join("\n")}

АКТИВЫ:
${investments.map(i => `- ${i.name}: ${i.quantity} шт., ${(i.current_value || i.purchase_price * i.quantity) / 100} ₽`).join("\n")}

Оцени:
1. Уровень диверсификации (0-100)
2. Уровень риска (conservative/moderate/aggressive)
3. Оценка риска (0-100)
4. Рекомендации по улучшению

Ответь в формате JSON:
{
  "diversificationScore": 70,
  "riskLevel": "moderate",
  "riskScore": 50,
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

    // Нормализуем проценты
    const normalizedByAssetClass: Record<string, number> = {};
    const normalizedByIndustry: Record<string, number> = {};
    const normalizedByCurrency: Record<string, number> = {};

    Object.entries(byAssetClass).forEach(([k, v]) => {
      normalizedByAssetClass[k] = (v / totalValue) * 100;
    });
    Object.entries(byIndustry).forEach(([k, v]) => {
      normalizedByIndustry[k] = (v / totalValue) * 100;
    });
    Object.entries(byCurrency).forEach(([k, v]) => {
      normalizedByCurrency[k] = (v / totalValue) * 100;
    });

    return {
      totalValue: totalValue / 100,
      totalCost: totalCost / 100,
      totalReturn: (totalValue - totalCost) / 100,
      returnPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      diversification: {
        score: result.diversificationScore || 50,
        byAssetClass: normalizedByAssetClass,
        byIndustry: normalizedByIndustry,
        byCurrency: normalizedByCurrency,
      },
      riskLevel: result.riskLevel || "moderate",
      riskScore: result.riskScore || 50,
      topPerformers,
      underperformers,
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    logger.error("Portfolio analysis error:", error);
    
    return {
      totalValue: totalValue / 100,
      totalCost: totalCost / 100,
      totalReturn: (totalValue - totalCost) / 100,
      returnPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      diversification: {
        score: 50,
        byAssetClass: {},
        byIndustry: {},
        byCurrency: {},
      },
      riskLevel: "moderate",
      riskScore: 50,
      topPerformers,
      underperformers,
      recommendations: ["Ошибка анализа. Попробуйте позже."],
    };
  }
}

/**
 * Генерирует рекомендации по инвестициям
 */
export async function getInvestmentRecommendations(
  userId: string,
  riskTolerance: "low" | "medium" | "high" = "medium",
  investmentHorizon: string = "1-3 года"
): Promise<InvestmentRecommendation[]> {
  const supabase = await createRSCClient();

  // Получаем текущий портфель
  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Получаем баланс счетов
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance, currency")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const availableCash = accounts?.reduce((sum, a) => sum + a.balance, 0) || 0;

  // Анализируем через Gemini
  const client = getGeminiClient();

  const recommendPrompt = `Дай рекомендации по инвестициям.

ПРОФИЛЬ ИНВЕСТОРА:
- Толерантность к риску: ${riskTolerance}
- Горизонт инвестирования: ${investmentHorizon}
- Доступные средства: ${(availableCash / 100).toFixed(2)} ₽

ТЕКУЩИЙ ПОРТФЕЛЬ:
${investments?.map(i => `- ${i.name} (${i.asset_class}): ${i.quantity} шт.`).join("\n") || "Пустой"}

Дай конкретные рекомендации с учётом:
1. Текущей рыночной ситуации в России
2. Диверсификации
3. Соотношения риск/доходность

Ответь в формате JSON:
{
  "recommendations": [
    {
      "action": "buy|sell|hold|rebalance",
      "asset": "название актива",
      "reason": "причина",
      "confidence": 0-100,
      "expectedReturn": ожидаемая доходность в %,
      "riskLevel": "low|medium|high",
      "timeHorizon": "срок"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: recommendPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.recommendations || [];
  } catch (error) {
    logger.error("Investment recommendations error:", error);
    return [];
  }
}

/**
 * Анализирует рыночную ситуацию
 */
export async function getMarketInsights(): Promise<MarketInsight> {
  const client = getGeminiClient();

  const insightPrompt = `Дай краткий обзор текущей рыночной ситуации для инвестора в России.

Проанализируй:
1. Общий тренд рынка
2. Ключевые факторы влияния
3. Перспективные секторы
4. Риски и возможности

Ответь в формате JSON:
{
  "trend": "bullish|bearish|neutral",
  "summary": "краткое резюме",
  "keyFactors": [
    {
      "factor": "название фактора",
      "impact": "positive|negative|neutral",
      "description": "описание"
    }
  ],
  "sectors": [
    {
      "name": "сектор",
      "outlook": "positive|negative|neutral",
      "reason": "причина"
    }
  ],
  "risks": ["риск 1"],
  "opportunities": ["возможность 1"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: insightPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Market insights error:", error);
    return {
      trend: "neutral",
      summary: "Не удалось получить данные о рынке",
      keyFactors: [],
      sectors: [],
      risks: [],
      opportunities: [],
    };
  }
}

/**
 * Рассчитывает оптимальное распределение портфеля
 */
export async function calculateOptimalAllocation(
  userId: string,
  targetAmount: number,
  riskProfile: "conservative" | "moderate" | "aggressive"
): Promise<{
  allocation: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  rebalanceActions: Array<{
    asset: string;
    action: "buy" | "sell";
    amount: number;
    reason: string;
  }>;
}> {
  const supabase = await createRSCClient();

  // Получаем текущий портфель
  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const currentValue = investments?.reduce(
    (sum, i) => sum + (i.current_value || i.purchase_price * i.quantity), 
    0
  ) || 0;

  // Анализируем через Gemini
  const client = getGeminiClient();

  const allocationPrompt = `Рассчитай оптимальное распределение портфеля.

ПАРАМЕТРЫ:
- Целевая сумма: ${(targetAmount / 100).toFixed(2)} ₽
- Текущая стоимость портфеля: ${(currentValue / 100).toFixed(2)} ₽
- Профиль риска: ${riskProfile}

ТЕКУЩИЙ ПОРТФЕЛЬ:
${investments?.map(i => {
  const value = i.current_value || i.purchase_price * i.quantity;
  return `- ${i.name} (${i.asset_class}): ${(value / 100).toFixed(2)} ₽`;
}).join("\n") || "Пустой"}

Рассчитай оптимальное распределение для профиля "${riskProfile}":
- Conservative: 60% облигации, 30% акции, 10% альтернативные
- Moderate: 40% облигации, 50% акции, 10% альтернативные
- Aggressive: 20% облигации, 70% акции, 10% альтернативные

Ответь в формате JSON:
{
  "allocation": {
    "bonds": процент,
    "stocks": процент,
    "alternatives": процент,
    "cash": процент
  },
  "expectedReturn": ожидаемая годовая доходность в %,
  "expectedRisk": ожидаемая волатильность в %,
  "rebalanceActions": [
    {
      "asset": "класс актива",
      "action": "buy|sell",
      "amount": сумма в копейках,
      "reason": "причина"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: allocationPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    logger.error("Optimal allocation error:", error);
    
    const defaultAllocations = {
      conservative: { bonds: 60, stocks: 30, alternatives: 5, cash: 5 },
      moderate: { bonds: 40, stocks: 50, alternatives: 5, cash: 5 },
      aggressive: { bonds: 20, stocks: 70, alternatives: 5, cash: 5 },
    };

    return {
      allocation: defaultAllocations[riskProfile],
      expectedReturn: riskProfile === "aggressive" ? 15 : riskProfile === "moderate" ? 10 : 6,
      expectedRisk: riskProfile === "aggressive" ? 25 : riskProfile === "moderate" ? 15 : 8,
      rebalanceActions: [],
    };
  }
}

/**
 * Генерирует отчёт для инвесторов
 */
export async function generateInvestorReport(
  userId: string,
  period: { start: string; end: string }
): Promise<string> {
  const analysis = await analyzePortfolio(userId);

  const client = getGeminiClient();

  const reportPrompt = `Создай профессиональный отчёт для инвестора.

ПЕРИОД: ${period.start} - ${period.end}

ПОРТФЕЛЬ:
- Общая стоимость: ${analysis.totalValue.toFixed(2)} ₽
- Общие затраты: ${analysis.totalCost.toFixed(2)} ₽
- Доходность: ${analysis.totalReturn.toFixed(2)} ₽ (${analysis.returnPercent.toFixed(2)}%)
- Уровень риска: ${analysis.riskLevel}
- Оценка диверсификации: ${analysis.diversification.score}/100

ТОП АКТИВЫ:
${analysis.topPerformers.map(a => `- ${a.name}: ${a.returnPercent.toFixed(2)}%`).join("\n")}

ОТСТАЮЩИЕ:
${analysis.underperformers.map(a => `- ${a.name}: ${a.returnPercent.toFixed(2)}%`).join("\n")}

Создай структурированный отчёт:
1. 📊 Резюме периода
2. 📈 Динамика портфеля
3. 🏆 Лучшие инвестиции
4. ⚠️ Требуют внимания
5. 🎯 Рекомендации
6. 📋 Прогноз

Используй профессиональный язык, таблицы и форматирование.`;

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: reportPrompt,
  });

  return response.text || "Не удалось создать отчёт.";
}

/**
 * Отслеживает дивиденды
 */
export async function trackDividends(
  userId: string,
  year: number
): Promise<{
  totalDividends: number;
  byAsset: Array<{
    name: string;
    amount: number;
    date: string;
    yield: number;
  }>;
  projectedAnnual: number;
  taxEstimate: number;
}> {
  const supabase = await createRSCClient();

  // Получаем дивидендные выплаты
  const { data: dividends } = await supabase
    .from("transactions")
    .select(`
      amount_minor,
      occurred_at,
      note,
      category_id,
      categories(name)
    `)
    .eq("user_id", userId)
    .eq("direction", "income")
    .gte("occurred_at", `${year}-01-01`)
    .lte("occurred_at", `${year}-12-31`)
    .or("note.ilike.%дивиденд%,note.ilike.%купон%");

  const totalDividends = dividends?.reduce((sum, d) => sum + d.amount_minor, 0) || 0;

  // Группируем по активам
  const byAsset = dividends?.map(d => ({
    name: d.note || "Неизвестный актив",
    amount: d.amount_minor / 100,
    date: d.occurred_at,
    yield: 0, // Нужна информация о стоимости актива
  })) || [];

  // Прогноз на год
  const monthsPassed = new Date().getMonth() + 1;
  const projectedAnnual = monthsPassed > 0 
    ? (totalDividends / monthsPassed) * 12 / 100
    : 0;

  // Оценка налога (13% для резидентов РФ)
  const taxEstimate = totalDividends * 0.13 / 100;

  return {
    totalDividends: totalDividends / 100,
    byAsset,
    projectedAnnual,
    taxEstimate,
  };
}
