/**
 * Советник по оптимизации финансов
 * 
 * Анализирует транзакции и выявляет возможности экономии:
 * - "Денежные утечки" (регулярные мелкие траты)
 * - Категории с потенциалом оптимизации
 * - Сравнение с рекомендуемыми бюджетами
 * - Персональные советы по сокращению расходов
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  amount: number;
  category_id: string | null;
  date: string;
  categories?: {
    name: string;
  } | null;
}

export interface OptimizationOpportunity {
  id: string;
  category: string;
  current_spending: number; // в копейках
  recommended_spending: number; // в копейках
  potential_savings: number; // в копейках
  savings_percentage: number;
  priority: "high" | "medium" | "low";
  advice: string;
  specific_tips: string[];
}

export interface MoneyLeak {
  category: string;
  frequency: number; // транзакций в месяц
  average_amount: number; // средняя сумма
  monthly_total: number; // итого в месяц
  leak_type: "frequent_small" | "subscription" | "impulse";
  impact: "high" | "medium" | "low";
  suggestion: string;
}

export interface OptimizationReport {
  total_monthly_spending: number;
  recommended_spending: number;
  total_potential_savings: number;
  savings_percentage: number;
  
  opportunities: OptimizationOpportunity[];
  money_leaks: MoneyLeak[];
  
  top_3_categories: {
    category: string;
    current: number;
    savings: number;
  }[];
  
  personalized_advice: string[];
  quick_wins: string[];
}

/**
 * Анализирует финансы и генерирует рекомендации по оптимизации
 */
export async function generateOptimizationReport(
  supabase: SupabaseClient,
  userId: string
): Promise<OptimizationReport> {
  // Получаем транзакции за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", threeMonthsAgo.toISOString())
    .order("occurred_at", { ascending: false });

  if (!transactions || transactions.length === 0) {
    return getEmptyReport();
  }

  // Группируем по категориям
  const categoryStats = analyzeCategorySpending(transactions);
  
  // Определяем рекомендуемые лимиты (50/30/20 правило)
  const totalIncome = await estimateIncome(supabase, userId);
  const recommendedLimits = calculateRecommendedLimits(totalIncome);
  
  // Находим возможности оптимизации
  const opportunities = findOptimizationOpportunities(
    categoryStats,
    recommendedLimits
  );
  
  // Детектим "денежные утечки"
  const moneyLeaks = detectMoneyLeaks(transactions);
  
  // Топ-3 категории для сокращения
  const top3 = opportunities
    .sort((a, b) => b.potential_savings - a.potential_savings)
    .slice(0, 3)
    .map((o) => ({
      category: o.category,
      current: o.current_spending,
      savings: o.potential_savings,
    }));

  // Считаем общую потенциальную экономию
  const totalSavings = opportunities.reduce(
    (sum, o) => sum + o.potential_savings,
    0
  );
  
  const totalSpending = Object.values(categoryStats).reduce(
    (sum, cat) => sum + cat.total,
    0
  );
  
  const recommendedTotal = totalSpending - totalSavings;
  const savingsPercentage = totalSpending > 0 
    ? (totalSavings / totalSpending) * 100 
    : 0;

  // Генерируем персональные советы
  const personalizedAdvice = generatePersonalizedAdvice(
    opportunities,
    moneyLeaks,
    totalIncome,
    totalSpending
  );
  
  // Быстрые победы (легко реализуемые советы)
  const quickWins = generateQuickWins(opportunities, moneyLeaks);

  return {
    total_monthly_spending: Math.round(totalSpending / 3),
    recommended_spending: Math.round(recommendedTotal / 3),
    total_potential_savings: totalSavings,
    savings_percentage: Math.round(savingsPercentage * 10) / 10,
    opportunities,
    money_leaks: moneyLeaks,
    top_3_categories: top3,
    personalized_advice: personalizedAdvice,
    quick_wins: quickWins,
  };
}

function getEmptyReport(): OptimizationReport {
  return {
    total_monthly_spending: 0,
    recommended_spending: 0,
    total_potential_savings: 0,
    savings_percentage: 0,
    opportunities: [],
    money_leaks: [],
    top_3_categories: [],
    personalized_advice: ["Недостаточно данных для анализа"],
    quick_wins: [],
  };
}

/**
 * Группирует транзакции по категориям и считает статистику
 */
function analyzeCategorySpending(transactions: Transaction[]): Record<
  string,
  {
    total: number;
    count: number;
    average: number;
    transactions: Transaction[];
  }
> {
  const stats: Record<string, { total: number; count: number; average: number; transactions: Transaction[] }> = {};

  transactions.forEach((t) => {
    const categoryName = t.categories?.name || "Без категории";
    
    if (!stats[categoryName]) {
      stats[categoryName] = {
        total: 0,
        count: 0,
        average: 0,
        transactions: [],
      };
    }

    stats[categoryName].total += Math.abs(t.amount);
    stats[categoryName].count += 1;
    stats[categoryName].transactions.push(t);
  });

  // Считаем средние
  Object.keys(stats).forEach((cat) => {
    stats[cat].average = stats[cat].total / stats[cat].count;
  });

  return stats;
}

/**
 * Оценивает доход пользователя
 */
async function estimateIncome(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: incomeTransactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("direction", "income")
    .gte("occurred_at", threeMonthsAgo.toISOString());

  if (!incomeTransactions || incomeTransactions.length === 0) {
    return 10000000; // 100,000₽ по умолчанию
  }

  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  return Math.round(totalIncome / 3);
}

/**
 * Рассчитывает рекомендуемые лимиты по правилу 50/30/20
 */
function calculateRecommendedLimits(monthlyIncome: number): Record<string, number> {
  return {
    // Необходимое (50%)
    "Продукты": monthlyIncome * 0.15,
    "Жильё": monthlyIncome * 0.20,
    "Транспорт": monthlyIncome * 0.10,
    "Здоровье": monthlyIncome * 0.05,
    
    // Желаемое (30%)
    "Рестораны": monthlyIncome * 0.05,
    "Кафе": monthlyIncome * 0.03,
    "Развлечения": monthlyIncome * 0.05,
    "Одежда": monthlyIncome * 0.07,
    "Образование": monthlyIncome * 0.05,
    "Связь": monthlyIncome * 0.05,
  };
}

/**
 * Находит возможности оптимизации
 */
function findOptimizationOpportunities(
  categoryStats: Record<string, { total: number; count: number; average: number; transactions: Transaction[] }>,
  recommendedLimits: Record<string, number>
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  Object.entries(categoryStats).forEach(([category, stats]) => {
    const monthlySpending = stats.total / 3;
    const recommended = recommendedLimits[category] || monthlySpending * 0.8;

    if (monthlySpending > recommended * 1.2) {
      const savings = monthlySpending - recommended;
      const savingsPercent = (savings / monthlySpending) * 100;

      const priority =
        savingsPercent >= 40
          ? "high"
          : savingsPercent >= 25
          ? "medium"
          : "low";

      opportunities.push({
        id: `opt-${category}`,
        category,
        current_spending: Math.round(monthlySpending),
        recommended_spending: Math.round(recommended),
        potential_savings: Math.round(savings),
        savings_percentage: Math.round(savingsPercent * 10) / 10,
        priority,
        advice: generateCategoryAdvice(category, savingsPercent),
        specific_tips: getSpecificTips(category),
      });
    }
  });

  return opportunities.sort((a, b) => b.potential_savings - a.potential_savings);
}

/**
 * Детектит "денежные утечки"
 */
function detectMoneyLeaks(transactions: Transaction[]): MoneyLeak[] {
  const leaks: MoneyLeak[] = [];
  const categoryGroups: Record<string, Transaction[]> = {};

  transactions.forEach((t) => {
    const cat = t.categories?.name || "Без категории";
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(t);
  });

  Object.entries(categoryGroups).forEach(([category, txs]) => {
    const monthlyCount = txs.length / 3;
    const avgAmount = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0) / txs.length;
    const monthlyTotal = (txs.reduce((sum, t) => sum + Math.abs(t.amount), 0)) / 3;

    // Частые мелкие покупки
    if (monthlyCount > 8 && avgAmount < 100000) {
      leaks.push({
        category,
        frequency: Math.round(monthlyCount),
        average_amount: Math.round(avgAmount),
        monthly_total: Math.round(monthlyTotal),
        leak_type: "frequent_small",
        impact: monthlyTotal > 500000 ? "high" : monthlyTotal > 300000 ? "medium" : "low",
        suggestion: `Сократите частоту покупок в категории "${category}" с ${Math.round(
          monthlyCount
        )} до 4-5 раз в месяц`,
      });
    }

    // Подписки
    const amounts = txs.map((t) => Math.abs(t.amount));
    const isRegular = amounts.length > 2 && amounts[0] > 0 && amounts.every((a) => Math.abs(a - amounts[0]) < amounts[0] * 0.1);
    
    if (isRegular && monthlyCount >= 1 && monthlyCount <= 2) {
      leaks.push({
        category,
        frequency: Math.round(monthlyCount),
        average_amount: Math.round(avgAmount),
        monthly_total: Math.round(monthlyTotal),
        leak_type: "subscription",
        impact: monthlyTotal > 300000 ? "high" : monthlyTotal > 150000 ? "medium" : "low",
        suggestion: `Пересмотрите необходимость подписки "${category}" (${formatMoney(
          monthlyTotal
        )}/мес)`,
      });
    }
  });

  return leaks.sort((a, b) => b.monthly_total - a.monthly_total);
}

function generateCategoryAdvice(category: string, savingsPercent: number): string {
  const templates: Record<string, string> = {
    "Кафе": `Сократите походы в кафе на ${Math.round(savingsPercent)}%. Попробуйте готовить кофе дома.`,
    "Рестораны": `Уменьшите частоту походов в рестораны. Готовьте дома чаще.`,
    "Развлечения": `Ищите бесплатные альтернативы развлечениям.`,
    "Одежда": `Покупайте одежду реже, планируйте покупки заранее.`,
    "Транспорт": `Рассмотрите более экономичные варианты транспорта.`,
    "Продукты": `Составляйте список покупок, избегайте импульсивных покупок.`,
  };

  return templates[category] || `Сократите расходы в категории "${category}" на ${Math.round(savingsPercent)}%`;
}

function getSpecificTips(category: string): string[] {
  const tips: Record<string, string[]> = {
    "Кафе": [
      "☕ Заваривайте кофе дома (экономия ~200₽/день)",
      "🏠 Берите термос с собой",
      "📅 Ограничьте походы до 2-3 раз в неделю",
    ],
    "Рестораны": [
      "🍳 Готовьте дома 5-6 дней в неделю",
      "📋 Планируйте меню заранее",
      "👥 Устраивайте домашние ужины",
    ],
    "Продукты": [
      "📝 Составляйте список покупок",
      "🛒 Ходите в магазин сытым",
      "💰 Покупайте товары со скидками",
    ],
    "Развлечения": [
      "🎬 Используйте совместные подписки",
      "🏞️ Ищите бесплатные мероприятия",
      "📚 Берите книги в библиотеке",
    ],
    "Транспорт": [
      "🚶 Ходите пешком на короткие расстояния",
      "🚲 Используйте велосипед",
      "🎫 Купите проездной",
    ],
  };

  return tips[category] || ["Планируйте покупки", "Сравнивайте цены", "Ищите альтернативы"];
}

function generatePersonalizedAdvice(
  opportunities: OptimizationOpportunity[],
  leaks: MoneyLeak[],
  income: number,
  spending: number
): string[] {
  const advice: string[] = [];
  const savingsRate = income > 0 ? ((income - spending / 3) / income) * 100 : 0;

  if (savingsRate < 10) {
    advice.push(`💰 Ваш процент накоплений ${savingsRate.toFixed(1)}% — слишком низкий. Стремитесь к 20%.`);
  } else if (savingsRate >= 20) {
    advice.push(`✅ Отлично! Вы откладываете ${savingsRate.toFixed(1)}% дохода.`);
  }

  const highImpactLeaks = leaks.filter((l) => l.impact === "high");
  if (highImpactLeaks.length > 0) {
    const totalLeakage = highImpactLeaks.reduce((sum, l) => sum + l.monthly_total, 0);
    advice.push(
      `🚰 Обнаружено ${highImpactLeaks.length} "денежных утечек" на ${formatMoney(totalLeakage)}/мес`
    );
  }

  if (opportunities.length > 0) {
    const top = opportunities[0];
    advice.push(`🎯 Наибольший потенциал в "${top.category}" — ${formatMoney(top.potential_savings)}/мес`);
  }

  return advice;
}

function generateQuickWins(
  opportunities: OptimizationOpportunity[],
  leaks: MoneyLeak[]
): string[] {
  const wins: string[] = [];

  const subscriptions = leaks.filter((l) => l.leak_type === "subscription");
  if (subscriptions.length > 0) {
    wins.push(
      `🔔 Отмените неиспользуемые подписки (${formatMoney(
        subscriptions.reduce((sum, s) => sum + s.monthly_total, 0)
      )}/мес)`
    );
  }

  const cafe = opportunities.find((o) => o.category === "Кафе");
  if (cafe && cafe.potential_savings > 100000) {
    wins.push(`☕ Готовьте кофе дома (${formatMoney(cafe.potential_savings)}/мес)`);
  }

  const restaurants = opportunities.find((o) => o.category === "Рестораны");
  if (restaurants && restaurants.potential_savings > 200000) {
    wins.push(`🍳 Готовьте обеды дома (${formatMoney(restaurants.potential_savings)}/мес)`);
  }

  return wins;
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

export function getPriorityColor(priority: OptimizationOpportunity["priority"]): string {
  switch (priority) {
    case "high":
      return "#dc2626";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#3b82f6";
  }
}

export function getImpactColor(impact: MoneyLeak["impact"]): string {
  switch (impact) {
    case "high":
      return "#dc2626";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#10b981";
  }
}
