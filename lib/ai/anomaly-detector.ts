/**
 * Детектор аномалий в финансовых тратах
 * 
 * Анализирует транзакции пользователя и выявляет:
 * - Превышение среднего уровня расходов на 20%+
 * - Необычно крупные транзакции
 * - Резкий рост трат по категориям
 * - Риск превышения бюджета
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

export interface SpendingAlert {
  id: string;
  type: "overspending" | "large_transaction" | "category_spike" | "budget_risk";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  amount?: number;
  category?: string;
  percentage?: number;
  recommendation: string;
  created_at: string;
}

export interface CategorySpending {
  category: string;
  current_month: number;
  previous_avg: number;
  change_percentage: number;
  is_anomaly: boolean;
}

export interface AnomalyReport {
  alerts: SpendingAlert[];
  total_spending_this_month: number;
  avg_monthly_spending: number;
  change_percentage: number;
  categories_at_risk: CategorySpending[];
  budgets_at_risk: {
    budget_name: string;
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }[];
}

/**
 * Анализирует траты пользователя и выявляет аномалии
 */
export async function detectSpendingAnomalies(
  supabase: SupabaseClient,
  userId: string
): Promise<AnomalyReport> {
  const alerts: SpendingAlert[] = [];
  
  // Получаем транзакции за текущий и последние 3 месяца
  const now = new Date();
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
    return {
      alerts: [],
      total_spending_this_month: 0,
      avg_monthly_spending: 0,
      change_percentage: 0,
      categories_at_risk: [],
      budgets_at_risk: [],
    };
  }

  // Разделяем транзакции по месяцам
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthTransactions = transactions.filter(
    (t) => new Date(t.occurred_at) >= currentMonthStart
  );
  const previousMonthsTransactions = transactions.filter(
    (t) => new Date(t.occurred_at) < currentMonthStart
  );

  // Рассчитываем траты за текущий месяц
  const totalCurrentMonth = currentMonthTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  // Средние траты за предыдущие месяцы
  const avgPreviousMonths =
    previousMonthsTransactions.length > 0
      ? previousMonthsTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / 3
      : 0;

  const changePercentage =
    avgPreviousMonths > 0
      ? ((totalCurrentMonth - avgPreviousMonths) / avgPreviousMonths) * 100
      : 0;

  // АЛЕРТ 1: Общее превышение среднего уровня расходов на 20%+
  if (changePercentage >= 20) {
    const severity =
      changePercentage >= 50
        ? "critical"
        : changePercentage >= 35
        ? "high"
        : "medium";

    alerts.push({
      id: `overspending-${Date.now()}`,
      type: "overspending",
      severity,
      title: "⚠️ Превышение среднего уровня расходов",
      message: `Ваши траты в этом месяце на ${changePercentage.toFixed(
        0
      )}% выше среднего (${formatMoney(totalCurrentMonth)} против ${formatMoney(
        avgPreviousMonths
      )})`,
      amount: totalCurrentMonth - avgPreviousMonths,
      percentage: changePercentage,
      recommendation: getSeverityRecommendation(severity),
      created_at: new Date().toISOString(),
    });
  }

  // АЛЕРТ 2: Крупные транзакции (>20% от среднемесячных трат)
  const largeTransactionThreshold = avgPreviousMonths * 0.2;
  const largeTransactions = currentMonthTransactions.filter(
    (t) => Math.abs(t.amount) > largeTransactionThreshold
  );

  largeTransactions.forEach((t) => {
    const percentage = (Math.abs(t.amount) / avgPreviousMonths) * 100;
    alerts.push({
      id: `large-${t.id}`,
      type: "large_transaction",
      severity: percentage >= 50 ? "high" : "medium",
      title: "💰 Необычно крупная транзакция",
      message: `Расход ${formatMoney(Math.abs(t.amount))} в категории "${
        t.categories?.name || "Без категории"
      }" составляет ${percentage.toFixed(0)}% от ваших обычных месячных трат`,
      amount: Math.abs(t.amount),
      category: t.categories?.name || "Без категории",
      percentage,
      recommendation: "Убедитесь, что это была запланированная покупка",
      created_at: t.occurred_at,
    });
  });

  // АЛЕРТ 3: Резкий рост трат по категориям
  const categoriesAtRisk = await analyzeCategorySpikes(
    currentMonthTransactions,
    previousMonthsTransactions
  );

  categoriesAtRisk
    .filter((c) => c.is_anomaly)
    .forEach((c) => {
      const severity =
        c.change_percentage >= 100
          ? "high"
          : c.change_percentage >= 50
          ? "medium"
          : "low";

      alerts.push({
        id: `spike-${c.category}`,
        type: "category_spike",
        severity,
        title: `📈 Резкий рост трат: ${c.category}`,
        message: `Траты по категории "${c.category}" выросли на ${c.change_percentage.toFixed(
          0
        )}% (${formatMoney(c.current_month)} против ${formatMoney(c.previous_avg)})`,
        amount: c.current_month - c.previous_avg,
        category: c.category,
        percentage: c.change_percentage,
        recommendation: `Пересмотрите траты в категории "${c.category}" и установите бюджет`,
        created_at: new Date().toISOString(),
      });
    });

  // АЛЕРТ 4: Риск превышения бюджета
  const budgetsAtRisk = await checkBudgetRisks(supabase, userId);
  
  budgetsAtRisk.forEach((b) => {
    if (b.percentage >= 80) {
      const severity =
        b.percentage >= 100
          ? "critical"
          : b.percentage >= 90
          ? "high"
          : "medium";

      alerts.push({
        id: `budget-${b.budget_name}`,
        type: "budget_risk",
        severity,
        title: `🎯 Риск превышения бюджета: ${b.budget_name}`,
        message: `Вы потратили ${b.percentage.toFixed(
          0
        )}% бюджета "${b.budget_name}" (${formatMoney(b.spent)} из ${formatMoney(
          b.limit
        )})`,
        amount: b.spent,
        category: b.category,
        percentage: b.percentage,
        recommendation:
          b.percentage >= 100
            ? "Бюджет превышен! Сократите расходы в этой категории"
            : "Будьте осторожны с тратами до конца месяца",
        created_at: new Date().toISOString(),
      });
    }
  });

  // Сортируем алерты по важности
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    alerts,
    total_spending_this_month: totalCurrentMonth,
    avg_monthly_spending: avgPreviousMonths,
    change_percentage: changePercentage,
    categories_at_risk: categoriesAtRisk,
    budgets_at_risk: budgetsAtRisk,
  };
}

/**
 * Анализирует изменения трат по категориям
 */
async function analyzeCategorySpikes(
  currentMonthTransactions: Transaction[],
  previousMonthsTransactions: Transaction[]
): Promise<CategorySpending[]> {
  const categories = new Map<string, CategorySpending>();

  // Текущий месяц
  currentMonthTransactions.forEach((t) => {
    const categoryName = t.categories?.name || "Без категории";
    const existing = categories.get(categoryName) || {
      category: categoryName,
      current_month: 0,
      previous_avg: 0,
      change_percentage: 0,
      is_anomaly: false,
    };
    existing.current_month += Math.abs(t.amount);
    categories.set(categoryName, existing);
  });

  // Предыдущие месяцы (среднее)
  const previousByCategory = new Map<string, number>();
  previousMonthsTransactions.forEach((t) => {
    const categoryName = t.categories?.name || "Без категории";
    previousByCategory.set(
      categoryName,
      (previousByCategory.get(categoryName) || 0) + Math.abs(t.amount)
    );
  });

  // Рассчитываем изменения
  categories.forEach((cat, name) => {
    const previousTotal = previousByCategory.get(name) || 0;
    cat.previous_avg = previousTotal / 3;

    if (cat.previous_avg > 0) {
      cat.change_percentage =
        ((cat.current_month - cat.previous_avg) / cat.previous_avg) * 100;
    } else if (cat.current_month > 0) {
      cat.change_percentage = 100;
    }

    // Аномалия если рост >= 50%
    cat.is_anomaly = cat.change_percentage >= 50 && cat.current_month > 50000; // > 500₽
  });

  return Array.from(categories.values()).sort(
    (a, b) => b.change_percentage - a.change_percentage
  );
}

/**
 * Проверяет риски превышения бюджетов
 */
async function checkBudgetRisks(
  supabase: SupabaseClient,
  userId: string
): Promise<
  {
    budget_name: string;
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }[]
> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Получаем активные бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, name, category_id, limit_amount, categories(name)")
    .eq("user_id", userId);

  if (!budgets || budgets.length === 0) {
    return [];
  }

  const risks = [];

  for (const budget of budgets) {
    // Получаем траты по категории
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("category_id", budget.category_id)
      .eq("direction", "expense")
      .gte("occurred_at", monthStart.toISOString());

    const spent = transactions
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;

    const percentage = (spent / budget.limit_amount) * 100;

    if (percentage >= 80) {
      risks.push({
        budget_name: budget.name,
        category: (Array.isArray(budget.categories) && budget.categories[0]?.name) || "Без категории",
        spent,
        limit: budget.limit_amount,
        percentage,
      });
    }
  }

  return risks.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Получает рекомендацию на основе серьёзности
 */
function getSeverityRecommendation(severity: SpendingAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "🚨 СРОЧНО! Немедленно сократите расходы и пересмотрите бюджет";
    case "high":
      return "⚠️ Высокий риск. Проанализируйте крупные траты и сократите необязательные расходы";
    case "medium":
      return "⚡ Будьте внимательны. Следите за расходами до конца месяца";
    case "low":
      return "💡 Небольшое отклонение. Продолжайте мониторить траты";
  }
}

/**
 * Форматирует деньги для отображения
 */
function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

/**
 * Получает цвет для уровня серьёзности
 */
export function getSeverityColor(severity: SpendingAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "#dc2626"; // red-600
    case "high":
      return "#ea580c"; // orange-600
    case "medium":
      return "#f59e0b"; // amber-500
    case "low":
      return "#3b82f6"; // blue-500
  }
}

/**
 * Получает иконку для типа алерта
 */
export function getAlertIcon(type: SpendingAlert["type"]): string {
  switch (type) {
    case "overspending":
      return "⚠️";
    case "large_transaction":
      return "💰";
    case "category_spike":
      return "📈";
    case "budget_risk":
      return "🎯";
  }
}
