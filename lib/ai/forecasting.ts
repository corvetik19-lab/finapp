/**
 * AI прогнозирование расходов
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * AI прогнозирование расходов и финансовые сценарии
 */

export interface MonthlyData {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryExpense {
  category: string;
  category_id: string;
  amount: number;
}

export interface ExpenseForecast {
  month: string;
  predicted_expense: number;
  confidence: number; // 0-100%
  breakdown: CategoryExpense[];
  trend: "increasing" | "decreasing" | "stable";
  factors: string[];
}

export interface WhatIfScenario {
  name: string;
  description: string;
  monthly_change: number; // + для дохода, - для расхода
  affects: "income" | "expense";
  category?: string;
}

export interface ScenarioResult {
  scenario: WhatIfScenario;
  original_balance: number;
  new_balance: number;
  difference: number;
  impact_percentage: number;
  recommendation: string;
  timeline: {
    month: string;
    original: number;
    new: number;
  }[];
}

/**
 * Прогноз расходов на следующий месяц на основе истории
 */
export function forecastNextMonth(
  historicalData: MonthlyData[]
): ExpenseForecast {
  if (historicalData.length < 2) {
    throw new Error("Недостаточно исторических данных для прогноза");
  }

  // Сортируем по дате
  const sorted = historicalData.sort((a, b) => a.month.localeCompare(b.month));
  
  // Простое линейное предсказание (средневзвешенное с большим весом для недавних месяцев)
  const weights = sorted.map((_, i) => i + 1); // 1, 2, 3...
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  const weightedExpense = sorted.reduce((sum, data, i) => {
    return sum + (data.expense * weights[i]);
  }, 0) / totalWeight;

  // Определение тренда
  const recentMonths = sorted.slice(-3);
  const avgRecent = recentMonths.reduce((sum, d) => sum + d.expense, 0) / recentMonths.length;
  const olderMonths = sorted.slice(0, -3);
  const avgOlder = olderMonths.length > 0 
    ? olderMonths.reduce((sum, d) => sum + d.expense, 0) / olderMonths.length
    : avgRecent;

  const trendChange = (avgRecent - avgOlder) / avgOlder * 100;
  let trend: "increasing" | "decreasing" | "stable";
  if (Math.abs(trendChange) < 5) {
    trend = "stable";
  } else if (trendChange > 0) {
    trend = "increasing";
  } else {
    trend = "decreasing";
  }

  // Уверенность зависит от стабильности данных
  const variance = sorted.reduce((sum, d) => {
    return sum + Math.pow(d.expense - weightedExpense, 2);
  }, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / weightedExpense; // коэффициент вариации
  const confidence = Math.max(50, Math.min(95, 100 - (cv * 100)));

  // Следующий месяц
  const lastMonth = new Date(sorted[sorted.length - 1].month + "-01");
  lastMonth.setMonth(lastMonth.getMonth() + 1);
  const nextMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  return {
    month: nextMonth,
    predicted_expense: Math.round(weightedExpense),
    confidence: Math.round(confidence),
    breakdown: [], // Будет заполнено позже с категориями
    trend,
    factors: generateFactors(trend, trendChange),
  };
}

function generateFactors(trend: string, changePercent: number): string[] {
  const factors: string[] = [];
  
  if (trend === "increasing") {
    factors.push(`Рост расходов на ${Math.abs(changePercent).toFixed(1)}%`);
    factors.push("Возможны сезонные факторы");
  } else if (trend === "decreasing") {
    factors.push(`Снижение расходов на ${Math.abs(changePercent).toFixed(1)}%`);
    factors.push("Успешная оптимизация бюджета");
  } else {
    factors.push("Стабильные траты");
    factors.push("Прогнозируемое поведение");
  }

  return factors;
}

/**
 * Прогноз достижения финансовой цели
 */
export function forecastGoalAchievement(
  currentSavings: number,
  goalAmount: number,
  monthlyIncome: number,
  monthlyExpense: number
): {
  months_to_goal: number;
  estimated_date: string;
  monthly_savings_needed: number;
  feasibility: "easy" | "moderate" | "challenging" | "unrealistic";
  recommendation: string;
} {
  const monthlyBalance = monthlyIncome - monthlyExpense;
  const currentSavingsRate = monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;
  
  const remaining = goalAmount - currentSavings;
  
  if (monthlyBalance <= 0) {
    return {
      months_to_goal: Infinity,
      estimated_date: "Недостижимо",
      monthly_savings_needed: remaining,
      feasibility: "unrealistic",
      recommendation: "Сначала необходимо сократить расходы или увеличить доходы",
    };
  }

  const monthsToGoal = Math.ceil(remaining / monthlyBalance);
  
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthsToGoal);
  
  let feasibility: "easy" | "moderate" | "challenging" | "unrealistic";
  if (currentSavingsRate >= 30) {
    feasibility = "easy";
  } else if (currentSavingsRate >= 15) {
    feasibility = "moderate";
  } else if (currentSavingsRate >= 5) {
    feasibility = "challenging";
  } else {
    feasibility = "unrealistic";
  }

  return {
    months_to_goal: monthsToGoal,
    estimated_date: targetDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
    monthly_savings_needed: monthlyBalance,
    feasibility,
    recommendation: generateGoalRecommendation(feasibility, currentSavingsRate, monthlyBalance, remaining),
  };
}

function generateGoalRecommendation(
  feasibility: string,
  savingsRate: number,
  monthlyBalance: number,
  remaining: number
): string {
  switch (feasibility) {
    case "easy":
      return "Отличный темп! Продолжайте в том же духе.";
    case "moderate":
      return `При текущем темпе накопите ${(remaining / 100).toFixed(0)} ₽. Можно ускорить, сократив необязательные расходы.`;
    case "challenging":
      return `Цель достижима, но потребует дисциплины. Рассмотрите увеличение доходов или оптимизацию крупных трат.`;
    default:
      return "Текущий баланс не позволяет накопить. Необходимо пересмотреть бюджет.";
  }
}

/**
 * "Что если?" симулятор сценариев
 */
export function simulateScenario(
  scenario: WhatIfScenario,
  currentMonthlyIncome: number,
  currentMonthlyExpense: number,
  months: number = 12
): ScenarioResult {
  const originalBalance = currentMonthlyIncome - currentMonthlyExpense;
  
  let newIncome = currentMonthlyIncome;
  let newExpense = currentMonthlyExpense;
  
  if (scenario.affects === "income") {
    newIncome += scenario.monthly_change;
  } else {
    newExpense += scenario.monthly_change;
  }
  
  const newBalance = newIncome - newExpense;
  const difference = newBalance - originalBalance;
  const impactPercentage = originalBalance !== 0 
    ? (difference / Math.abs(originalBalance)) * 100 
    : 0;

  // Строим таймлайн для сравнения
  const timeline: { month: string; original: number; new: number }[] = [];
  let cumulativeOriginal = 0;
  let cumulativeNew = 0;
  
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const monthStr = date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
    
    cumulativeOriginal += originalBalance;
    cumulativeNew += newBalance;
    
    timeline.push({
      month: monthStr,
      original: cumulativeOriginal,
      new: cumulativeNew,
    });
  }

  return {
    scenario,
    original_balance: originalBalance,
    new_balance: newBalance,
    difference,
    impact_percentage: impactPercentage,
    recommendation: generateScenarioRecommendation(scenario, difference, timeline[timeline.length - 1].new),
    timeline,
  };
}

function generateScenarioRecommendation(
  scenario: WhatIfScenario,
  monthlyDifference: number,
  yearBalance: number
): string {
  const absChange = Math.abs(monthlyDifference / 100);
  const yearChange = Math.abs(yearBalance / 100);

  if (scenario.affects === "income" && scenario.monthly_change > 0) {
    return `При повышении дохода вы будете экономить дополнительно ${absChange.toFixed(0)} ₽/мес. За год это ${yearChange.toFixed(0)} ₽.`;
  } else if (scenario.affects === "expense" && scenario.monthly_change < 0) {
    return `Сократив ${scenario.category || "расходы"}, вы сэкономите ${absChange.toFixed(0)} ₽/мес. За год это ${yearChange.toFixed(0)} ₽!`;
  } else if (scenario.affects === "expense" && scenario.monthly_change > 0) {
    return `Увеличение ${scenario.category || "расходов"} на ${absChange.toFixed(0)} ₽/мес снизит накопления на ${yearChange.toFixed(0)} ₽ за год.`;
  }
  
  return `Этот сценарий изменит ваш баланс на ${monthlyDifference > 0 ? "+" : ""}${absChange.toFixed(0)} ₽/мес.`;
}

/**
 * AI анализ прогноза с рекомендациями
 */
export async function generateForecastInsights(
  forecast: ExpenseForecast,
  currentIncome: number,
  savingsGoal?: number
): Promise<string> {
  try {
    const prompt = `Проанализируй финансовый прогноз и дай короткий (2-3 предложения) инсайт с рекомендацией.

Прогноз на следующий месяц:
- Ожидаемые расходы: ${(forecast.predicted_expense / 100).toFixed(0)} ₽
- Уверенность прогноза: ${forecast.confidence}%
- Тренд: ${forecast.trend === "increasing" ? "рост" : forecast.trend === "decreasing" ? "снижение" : "стабильно"}
- Месячный доход: ${(currentIncome / 100).toFixed(0)} ₽
${savingsGoal ? `- Цель накоплений: ${(savingsGoal / 100).toFixed(0)} ₽` : ""}

Дай практический совет как оптимизировать бюджет.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
    });

    return text.trim();
  } catch (error) {
    console.error("Forecast insights generation error:", error);
    return "Продолжайте следить за расходами и придерживайтесь бюджета";
  }
}
