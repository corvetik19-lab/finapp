/**
 * Детектор паттернов трат для умных уведомлений
 * 
 * Анализирует:
 * - Аномальные траты (выше среднего)
 * - Превышение исторических средних
 * - Необычные категории
 * - Увеличение частоты трат
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface SpendingAlert {
  type: "overspending" | "unusual_category" | "high_frequency" | "large_transaction";
  severity: "high" | "medium" | "low";
  category?: string;
  message: string;
  details: {
    current_amount?: number;
    average_amount?: number;
    difference_percentage?: number;
    transaction_count?: number;
  };
  recommendation?: string;
}

export interface SpendingPattern {
  category: string;
  average_monthly: number;
  current_month: number;
  difference: number;
  difference_percentage: number;
  is_anomaly: boolean;
}

/**
 * Анализирует паттерны трат и генерирует алерты
 */
export async function detectSpendingAnomalies(
  supabase: SupabaseClient,
  userId: string
): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = [];

  // Получаем транзакции за последние 6 месяцев
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", sixMonthsAgo.toISOString())
    .order("occurred_at", { ascending: false });

  if (!transactions || transactions.length === 0) {
    return alerts;
  }

  // Разделяем на текущий месяц и историю
  const currentMonth = new Date();
  const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

  const currentMonthTransactions = transactions.filter(
    (t) => new Date(t.occurred_at) >= currentMonthStart
  );
  const historicalTransactions = transactions.filter(
    (t) => new Date(t.occurred_at) < currentMonthStart
  );

  // Анализ по категориям
  const patterns = analyzeSpendingPatterns(currentMonthTransactions, historicalTransactions);

  // Генерируем алерты для аномалий
  patterns.forEach((pattern) => {
    if (pattern.is_anomaly && pattern.difference_percentage > 30) {
      const severity: SpendingAlert["severity"] =
        pattern.difference_percentage > 80 ? "high" :
        pattern.difference_percentage > 50 ? "medium" : "low";

      alerts.push({
        type: "overspending",
        severity,
        category: pattern.category,
        message: `Траты на "${pattern.category}" выше обычного на ${pattern.difference_percentage.toFixed(0)}%`,
        details: {
          current_amount: pattern.current_month,
          average_amount: pattern.average_monthly,
          difference_percentage: pattern.difference_percentage,
        },
        recommendation: getRecommendation(pattern),
      });
    }
  });

  // Детектор крупных транзакций
  const largeTransactionAlerts = detectLargeTransactions(currentMonthTransactions, historicalTransactions);
  alerts.push(...largeTransactionAlerts);

  // Детектор высокой частоты
  const frequencyAlerts = detectHighFrequency(currentMonthTransactions, historicalTransactions);
  alerts.push(...frequencyAlerts);

  // Детектор необычных категорий
  const unusualCategoryAlerts = detectUnusualCategories(currentMonthTransactions, historicalTransactions);
  alerts.push(...unusualCategoryAlerts);

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function analyzeSpendingPatterns(
  currentMonth: any[],
  historical: any[]
): SpendingPattern[] {
  const patterns: SpendingPattern[] = [];

  // Группируем по категориям
  const categoryMap = new Map<string, { current: number; history: number[] }>();

  // Текущий месяц
  currentMonth.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    const amount = Math.abs(t.amount);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { current: 0, history: [] });
    }

    categoryMap.get(category)!.current += amount;
  });

  // Исторические данные (по месяцам)
  const monthlyHistorical = groupByMonth(historical);

  monthlyHistorical.forEach((monthData) => {
    monthData.forEach((t) => {
      const category = t.categories?.name || "Без категории";
      const amount = Math.abs(t.amount);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { current: 0, history: [] });
      }

      const data = categoryMap.get(category)!;
      const lastMonthIndex = data.history.length - 1;
      
      if (lastMonthIndex < 0 || data.history.length === 0) {
        data.history.push(amount);
      } else {
        data.history[data.history.length - 1] += amount;
      }
    });
  });

  // Анализируем паттерны
  categoryMap.forEach((data, category) => {
    if (data.history.length < 2) return; // Недостаточно истории

    const averageMonthly = data.history.reduce((sum, val) => sum + val, 0) / data.history.length;
    const stdDev = calculateStdDev(data.history);
    const difference = data.current - averageMonthly;
    const differencePercentage = averageMonthly > 0 ? (difference / averageMonthly) * 100 : 0;

    // Аномалия: текущее значение > среднее + 2 * stdDev
    const isAnomaly = data.current > averageMonthly + 2 * stdDev && differencePercentage > 30;

    patterns.push({
      category,
      average_monthly: Math.round(averageMonthly),
      current_month: Math.round(data.current),
      difference: Math.round(difference),
      difference_percentage: Math.round(differencePercentage * 10) / 10,
      is_anomaly: isAnomaly,
    });
  });

  return patterns.sort((a, b) => b.difference_percentage - a.difference_percentage);
}

function detectLargeTransactions(currentMonth: any[], historical: any[]): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  // Средняя транзакция из истории
  const historicalAmounts = historical.map((t) => Math.abs(t.amount));
  const avgTransaction = historicalAmounts.reduce((sum, val) => sum + val, 0) / historicalAmounts.length;
  const stdDev = calculateStdDev(historicalAmounts);

  // Ищем большие транзакции (> среднее + 3 * stdDev)
  const threshold = avgTransaction + 3 * stdDev;

  currentMonth.forEach((t) => {
    const amount = Math.abs(t.amount);
    if (amount > threshold && amount > 10000) { // минимум 100 рублей
      const category = t.categories?.name || "Без категории";
      const differencePercentage = avgTransaction > 0 ? ((amount - avgTransaction) / avgTransaction) * 100 : 0;

      alerts.push({
        type: "large_transaction",
        severity: amount > avgTransaction * 5 ? "high" : "medium",
        category,
        message: `Необычно крупная транзакция в "${category}": ${formatMoney(amount)}`,
        details: {
          current_amount: amount,
          average_amount: Math.round(avgTransaction),
          difference_percentage: Math.round(differencePercentage),
        },
        recommendation: `Проверьте, была ли это запланированная покупка`,
      });
    }
  });

  return alerts.slice(0, 3); // максимум 3 алерта
}

function detectHighFrequency(currentMonth: any[], historical: any[]): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  // Группируем по категориям
  const currentFrequency = new Map<string, number>();
  currentMonth.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    currentFrequency.set(category, (currentFrequency.get(category) || 0) + 1);
  });

  // Историческая частота (средняя за месяц)
  const monthlyHistorical = groupByMonth(historical);
  const historicalFrequency = new Map<string, number[]>();

  monthlyHistorical.forEach((monthData) => {
    const monthCounts = new Map<string, number>();
    monthData.forEach((t) => {
      const category = t.categories?.name || "Без категории";
      monthCounts.set(category, (monthCounts.get(category) || 0) + 1);
    });

    monthCounts.forEach((count, category) => {
      if (!historicalFrequency.has(category)) {
        historicalFrequency.set(category, []);
      }
      historicalFrequency.get(category)!.push(count);
    });
  });

  // Анализируем
  currentFrequency.forEach((currentCount, category) => {
    const history = historicalFrequency.get(category);
    if (!history || history.length < 2) return;

    const avgCount = history.reduce((sum, val) => sum + val, 0) / history.length;
    const stdDev = calculateStdDev(history);

    if (currentCount > avgCount + 2 * stdDev && currentCount > avgCount * 1.5) {
      const differencePercentage = avgCount > 0 ? ((currentCount - avgCount) / avgCount) * 100 : 0;

      alerts.push({
        type: "high_frequency",
        severity: differencePercentage > 100 ? "high" : "medium",
        category,
        message: `Участились траты в "${category}": ${currentCount} транзакций (обычно ${Math.round(avgCount)})`,
        details: {
          transaction_count: currentCount,
          difference_percentage: Math.round(differencePercentage),
        },
        recommendation: `Обратите внимание на частоту покупок в этой категории`,
      });
    }
  });

  return alerts.slice(0, 2);
}

function detectUnusualCategories(currentMonth: any[], historical: any[]): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  // Категории из истории
  const historicalCategories = new Set<string>();
  historical.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    historicalCategories.add(category);
  });

  // Новые категории в текущем месяце
  const categorySums = new Map<string, number>();
  currentMonth.forEach((t) => {
    const category = t.categories?.name || "Без категории";
    const amount = Math.abs(t.amount);

    if (!historicalCategories.has(category)) {
      categorySums.set(category, (categorySums.get(category) || 0) + amount);
    }
  });

  // Генерируем алерты только для значимых сумм
  categorySums.forEach((amount, category) => {
    if (amount > 5000) { // минимум 50 рублей
      alerts.push({
        type: "unusual_category",
        severity: amount > 50000 ? "medium" : "low",
        category,
        message: `Новая категория трат: "${category}" (${formatMoney(amount)})`,
        details: {
          current_amount: amount,
        },
        recommendation: `Проверьте, нужна ли эта новая категория расходов`,
      });
    }
  });

  return alerts.slice(0, 2);
}

function groupByMonth(transactions: any[]): any[][] {
  const monthMap = new Map<string, any[]>();

  transactions.forEach((t) => {
    const month = new Date(t.occurred_at).toISOString().slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, []);
    }
    monthMap.get(month)!.push(t);
  });

  return Array.from(monthMap.values());
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
}

function getRecommendation(pattern: SpendingPattern): string {
  if (pattern.difference_percentage > 80) {
    return `Критическое превышение! Проверьте бюджет категории "${pattern.category}" и рассмотрите возможность сокращения трат.`;
  } else if (pattern.difference_percentage > 50) {
    return `Значительное превышение. Рекомендуем пересмотреть траты в "${pattern.category}".`;
  } else {
    return `Умеренное превышение. Следите за тратами в "${pattern.category}".`;
  }
}

function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}
