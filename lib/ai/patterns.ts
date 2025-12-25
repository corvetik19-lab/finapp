import { logger } from "@/lib/logger";
import { getOpenRouterClient } from "./openrouter-client";

/**
 * Анализ паттернов трат пользователя через AI
 */

export interface SpendingPattern {
  category: string;
  averageAmount: number;
  standardDeviation: number;
  transactionCount: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface PatternAnalysis {
  isAnomaly: boolean;
  severity: "low" | "medium" | "high";
  message: string;
  recommendation?: string;
}

/**
 * Проверяет есть ли аномалии в тратах по категории
 */
export async function detectSpendingAnomaly(
  category: string,
  currentAmount: number,
  historicalData: { amount: number; date: string }[]
): Promise<PatternAnalysis> {
  if (historicalData.length < 3) {
    return {
      isAnomaly: false,
      severity: "low",
      message: "Недостаточно данных для анализа",
    };
  }

  // Рассчитываем среднее и стандартное отклонение
  const amounts = historicalData.map((d) => d.amount / 100);
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  const currentAmountRub = currentAmount / 100;
  const deviation = Math.abs(currentAmountRub - average);
  const deviationMultiple = stdDev > 0 ? deviation / stdDev : 0;

  // Если отклонение больше 2 стандартных отклонений - аномалия
  const isAnomaly = deviationMultiple > 2;
  const severity: "low" | "medium" | "high" =
    deviationMultiple > 3 ? "high" : deviationMultiple > 2 ? "medium" : "low";

  if (!isAnomaly) {
    return {
      isAnomaly: false,
      severity: "low",
      message: "Траты в пределах нормы",
    };
  }

  // Генерируем сообщение через AI
  try {
    const prompt = `Проанализируй финансовую аномалию:
Категория: ${category}
Текущие траты: ${currentAmountRub.toFixed(2)} ₽
Обычно тратится: ${average.toFixed(2)} ₽ (среднее за период)
Отклонение: ${deviation.toFixed(2)} ₽ (в ${deviationMultiple.toFixed(1)} раз больше обычного)

Напиши короткое (1-2 предложения) предупреждение для пользователя и дай одну конкретную рекомендацию.
Формат ответа:
Сообщение: [текст]
Рекомендация: [текст]`;

    const client = getOpenRouterClient();
    const response = await client.chat([
      { role: "user", content: prompt }
    ], { temperature: 0.7 });

    const text = response.choices[0]?.message?.content || "";

    // Парсим ответ
    const lines = text.split("\n").filter((l: string) => l.trim());
    let message = "";
    let recommendation = "";

    lines.forEach((line: string) => {
      if (line.startsWith("Сообщение:")) {
        message = line.replace("Сообщение:", "").trim();
      } else if (line.startsWith("Рекомендация:")) {
        recommendation = line.replace("Рекомендация:", "").trim();
      }
    });

    return {
      isAnomaly: true,
      severity,
      message: message || `Вы тратите на ${category} в ${deviationMultiple.toFixed(1)} раз больше обычного`,
      recommendation: recommendation || "Проверьте свои траты в этой категории",
    };
  } catch (error) {
    logger.error("AI pattern analysis error:", error);
    return {
      isAnomaly: true,
      severity,
      message: `Вы тратите на ${category} в ${deviationMultiple.toFixed(1)} раз больше обычного (${currentAmountRub.toFixed(0)} ₽ вместо обычных ${average.toFixed(0)} ₽)`,
      recommendation: "Рассмотрите возможность сокращения расходов в этой категории",
    };
  }
}

/**
 * Проверяет не забыл ли пользователь внести транзакции
 */
export function detectMissingTransactions(
  lastTransactionDate: Date
): { isMissing: boolean; daysSince: number; message: string } {
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince >= 3) {
    return {
      isMissing: true,
      daysSince,
      message: `Вы не вносили транзакции ${daysSince} дней. Не забыли что-то записать?`,
    };
  }

  return {
    isMissing: false,
    daysSince,
    message: "Всё в порядке",
  };
}

/**
 * Проверяет не превышен ли бюджет
 */
export function checkBudgetStatus(
  spent: number,
  budget: number,
  category: string
): {
  status: "ok" | "warning" | "exceeded";
  percentage: number;
  message: string;
} {
  const percentage = (spent / budget) * 100;

  if (percentage >= 100) {
    return {
      status: "exceeded",
      percentage,
      message: `Бюджет на "${category}" превышен! Потрачено ${percentage.toFixed(0)}% от лимита`,
    };
  }

  if (percentage >= 80) {
    return {
      status: "warning",
      percentage,
      message: `Бюджет на "${category}" почти исчерпан (${percentage.toFixed(0)}% использовано)`,
    };
  }

  return {
    status: "ok",
    percentage,
    message: `Бюджет в норме (${percentage.toFixed(0)}%)`,
  };
}

/**
 * Анализ трендов трат (растут/падают)
 */
export function analyzeTrend(
  data: { month: string; amount: number }[]
): {
  trend: "increasing" | "decreasing" | "stable";
  change: number; // %
  message: string;
} {
  if (data.length < 2) {
    return {
      trend: "stable",
      change: 0,
      message: "Недостаточно данных",
    };
  }

  // Сравниваем последние 2 месяца
  const latest = data[data.length - 1].amount;
  const previous = data[data.length - 2].amount;

  const change = previous > 0 ? ((latest - previous) / previous) * 100 : 0;

  if (Math.abs(change) < 10) {
    return {
      trend: "stable",
      change,
      message: "Траты стабильны",
    };
  }

  if (change > 0) {
    return {
      trend: "increasing",
      change,
      message: `Траты выросли на ${change.toFixed(1)}%`,
    };
  }

  return {
    trend: "decreasing",
    change: Math.abs(change),
    message: `Траты снизились на ${Math.abs(change).toFixed(1)}%`,
  };
}

/**
 * Генерирует персонализированный AI инсайт
 */
export async function generateFinancialInsight(
  userData: {
    totalIncome: number;
    totalExpense: number;
    savingsRate: number;
    topCategories: { name: string; amount: number }[];
    budgetStatus: string;
  }
): Promise<string> {
  try {
    const prompt = `Ты финансовый аналитик. Проанализируй данные пользователя и дай короткий (2-3 предложения) персональный инсайт.

Данные:
- Доход: ${(userData.totalIncome / 100).toFixed(0)} ₽
- Расход: ${(userData.totalExpense / 100).toFixed(0)} ₽
- Норма сбережений: ${userData.savingsRate.toFixed(1)}%
- Топ категории: ${userData.topCategories.map((c) => `${c.name} (${(c.amount / 100).toFixed(0)} ₽)`).join(", ")}
- Статус бюджета: ${userData.budgetStatus}

Дай позитивный и мотивирующий совет. Без лишнего текста, сразу по делу.`;

    const client = getOpenRouterClient();
    const response = await client.chat([
      { role: "user", content: prompt }
    ], { temperature: 0.8 });

    const text = response.choices[0]?.message?.content || "";
    return text.trim();
  } catch (error) {
    logger.error("AI insight generation error:", error);
    return "Продолжайте отслеживать свои расходы для лучшего контроля финансов";
  }
}
