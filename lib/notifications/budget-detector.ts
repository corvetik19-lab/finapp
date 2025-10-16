/**
 * Детектор превышения бюджетов
 * 
 * Отслеживает:
 * - 50% от лимита (предупреждение)
 * - 80% от лимита (внимание)
 * - 100% от лимита (критично)
 * - 120% от лимита (перерасход)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface BudgetAlert {
  type: "budget_warning" | "budget_critical" | "budget_exceeded";
  severity: "high" | "medium" | "low";
  budget_id: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
  percentage: number;
  remaining: number;
  message: string;
  recommendation: string;
}

/**
 * Проверяет состояние бюджетов и генерирует алерты
 */
export async function detectBudgetAlerts(
  supabase: SupabaseClient,
  userId: string
): Promise<BudgetAlert[]> {
  const alerts: BudgetAlert[] = [];

  // Получаем активные бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!budgets || budgets.length === 0) {
    return alerts;
  }

  // Текущий период (месяц)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Для каждого бюджета проверяем расходы
  for (const budget of budgets) {
    // Получаем расходы по категории за текущий период
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("category_id", budget.category_id)
      .eq("direction", "expense")
      .gte("occurred_at", monthStart.toISOString())
      .lte("occurred_at", monthEnd.toISOString());

    const spent = transactions
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;

    const limit = budget.amount_limit;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const remaining = limit - spent;
    const category = budget.categories?.name || "Категория";

    // Генерируем алерты на основе процента
    if (percentage >= 120) {
      // Перерасход более 20%
      alerts.push({
        type: "budget_exceeded",
        severity: "high",
        budget_id: budget.id,
        category,
        limit_amount: limit,
        spent_amount: spent,
        percentage: Math.round(percentage),
        remaining,
        message: `Перерасход бюджета "${category}": ${Math.round(percentage)}% (${formatMoney(spent)} из ${formatMoney(limit)})`,
        recommendation: getBudgetRecommendation(percentage, category, remaining),
      });
    } else if (percentage >= 100) {
      // Бюджет исчерпан
      alerts.push({
        type: "budget_exceeded",
        severity: "high",
        budget_id: budget.id,
        category,
        limit_amount: limit,
        spent_amount: spent,
        percentage: Math.round(percentage),
        remaining,
        message: `Бюджет "${category}" исчерпан: ${formatMoney(spent)} из ${formatMoney(limit)}`,
        recommendation: getBudgetRecommendation(percentage, category, remaining),
      });
    } else if (percentage >= 80) {
      // Приближение к лимиту
      alerts.push({
        type: "budget_critical",
        severity: "medium",
        budget_id: budget.id,
        category,
        limit_amount: limit,
        spent_amount: spent,
        percentage: Math.round(percentage),
        remaining,
        message: `Бюджет "${category}" почти исчерпан: ${Math.round(percentage)}% (осталось ${formatMoney(remaining)})`,
        recommendation: getBudgetRecommendation(percentage, category, remaining),
      });
    } else if (percentage >= 50) {
      // Половина бюджета потрачена
      alerts.push({
        type: "budget_warning",
        severity: "low",
        budget_id: budget.id,
        category,
        limit_amount: limit,
        spent_amount: spent,
        percentage: Math.round(percentage),
        remaining,
        message: `Половина бюджета "${category}" потрачена: ${Math.round(percentage)}%`,
        recommendation: getBudgetRecommendation(percentage, category, remaining),
      });
    }
  }

  return alerts.sort((a, b) => {
    // Сортируем по серьёзности, затем по проценту
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.percentage - a.percentage;
  });
}

/**
 * Прогнозирует, когда бюджет будет исчерпан
 */
export async function forecastBudgetDepletion(
  supabase: SupabaseClient,
  userId: string,
  budgetId: string
): Promise<{
  days_until_depleted: number | null;
  projected_overspend: number;
  daily_rate: number;
} | null> {
  // Получаем бюджет
  const { data: budget } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", budgetId)
    .eq("user_id", userId)
    .single();

  if (!budget) return null;

  // Расходы за текущий месяц
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, occurred_at")
    .eq("user_id", userId)
    .eq("category_id", budget.category_id)
    .eq("direction", "expense")
    .gte("occurred_at", monthStart.toISOString());

  if (!transactions || transactions.length === 0) {
    return null;
  }

  const spent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyRate = spent / daysElapsed;

  const remaining = budget.amount_limit - spent;
  const daysUntilDepleted = remaining > 0 ? Math.floor(remaining / dailyRate) : 0;

  // Прогноз на конец месяца
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const projectedSpend = spent + dailyRate * daysRemaining;
  const projectedOverspend = Math.max(0, projectedSpend - budget.amount_limit);

  return {
    days_until_depleted: daysUntilDepleted > 0 ? daysUntilDepleted : null,
    projected_overspend: Math.round(projectedOverspend),
    daily_rate: Math.round(dailyRate),
  };
}

/**
 * Получает сводку по всем бюджетам
 */
export async function getBudgetsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  total_budgets: number;
  budgets_on_track: number;
  budgets_at_risk: number; // 80%+
  budgets_exceeded: number; // 100%+
  total_limit: number;
  total_spent: number;
}> {
  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount_limit, category_id")
    .eq("user_id", userId);

  if (!budgets) {
    return {
      total_budgets: 0,
      budgets_on_track: 0,
      budgets_at_risk: 0,
      budgets_exceeded: 0,
      total_limit: 0,
      total_spent: 0,
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let totalLimit = 0;
  let totalSpent = 0;
  let budgetsOnTrack = 0;
  let budgetsAtRisk = 0;
  let budgetsExceeded = 0;

  for (const budget of budgets) {
    totalLimit += budget.amount_limit;

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("category_id", budget.category_id)
      .eq("direction", "expense")
      .gte("occurred_at", monthStart.toISOString())
      .lte("occurred_at", monthEnd.toISOString());

    const spent = transactions
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;

    totalSpent += spent;

    const percentage = budget.amount_limit > 0 ? (spent / budget.amount_limit) * 100 : 0;

    if (percentage >= 100) {
      budgetsExceeded++;
    } else if (percentage >= 80) {
      budgetsAtRisk++;
    } else {
      budgetsOnTrack++;
    }
  }

  return {
    total_budgets: budgets.length,
    budgets_on_track: budgetsOnTrack,
    budgets_at_risk: budgetsAtRisk,
    budgets_exceeded: budgetsExceeded,
    total_limit: totalLimit,
    total_spent: totalSpent,
  };
}

function getBudgetRecommendation(percentage: number, category: string, remaining: number): string {
  if (percentage >= 120) {
    return `Критическая ситуация! Перерасход в "${category}". Срочно пересмотрите траты или увеличьте бюджет.`;
  } else if (percentage >= 100) {
    return `Бюджет "${category}" исчерпан. Избегайте дальнейших трат в этой категории до конца месяца.`;
  } else if (percentage >= 80) {
    return `Осталось ${formatMoney(remaining)} в "${category}". Планируйте траты осторожно до конца месяца.`;
  } else {
    return `Бюджет "${category}" в норме. Продолжайте контролировать расходы.`;
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
