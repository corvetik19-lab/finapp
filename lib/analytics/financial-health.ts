/**
 * Библиотека оценки финансового здоровья
 * 
 * Рассчитывает:
 * - Общий score (0-100 баллов)
 * - Оценки по категориям: сбережения, бюджет, долги, стабильность
 * - Рекомендации по улучшению
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface FinancialHealthReport {
  overall_score: number; // 0-100
  grade: "excellent" | "good" | "fair" | "poor"; // A, B, C, D
  categories: {
    savings: CategoryScore;
    budget: CategoryScore;
    debt: CategoryScore;
    stability: CategoryScore;
  };
  insights: string[];
  recommendations: Recommendation[];
}

export interface CategoryScore {
  score: number; // 0-100
  weight: number; // вес в общем score
  status: "excellent" | "good" | "fair" | "poor";
  details: string;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: number; // потенциальное улучшение score
}

/**
 * Анализирует финансовое здоровье
 */
export async function analyzeFinancialHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialHealthReport> {
  // Данные за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Получаем транзакции
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_at", threeMonthsAgo.toISOString())
    .order("occurred_at", { ascending: false });

  // Получаем бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId);

  // Получаем планы (цели)
  const { data: plans } = await supabase
    .from("plans")
    .select("*, plan_topups(*)")
    .eq("user_id", userId);

  if (!transactions || transactions.length === 0) {
    return getEmptyReport();
  }

  // Разделяем транзакции
  const income = transactions.filter((t) => t.direction === "income");
  const expenses = transactions.filter((t) => t.direction === "expense");

  const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Оценка сбережений
  const savingsScore = calculateSavingsScore(totalIncome, totalExpenses, plans || []);

  // Оценка бюджета
  const budgetScore = calculateBudgetScore(expenses, budgets || []);

  // Оценка долгов (упрощённо - через расходы на кредиты)
  const debtScore = calculateDebtScore(expenses);

  // Оценка стабильности
  const stabilityScore = calculateStabilityScore(transactions);

  // Общий score (взвешенная сумма)
  const overallScore = Math.round(
    savingsScore.score * savingsScore.weight +
      budgetScore.score * budgetScore.weight +
      debtScore.score * debtScore.weight +
      stabilityScore.score * stabilityScore.weight
  );

  const grade = getGrade(overallScore);

  // Инсайты
  const insights = generateInsights(overallScore, {
    savings: savingsScore,
    budget: budgetScore,
    debt: debtScore,
    stability: stabilityScore,
  });

  // Рекомендации
  const recommendations = generateRecommendations({
    savings: savingsScore,
    budget: budgetScore,
    debt: debtScore,
    stability: stabilityScore,
  });

  return {
    overall_score: overallScore,
    grade,
    categories: {
      savings: savingsScore,
      budget: budgetScore,
      debt: debtScore,
      stability: stabilityScore,
    },
    insights,
    recommendations,
  };
}

function calculateSavingsScore(
  totalIncome: number,
  totalExpenses: number,
  plans: any[]
): CategoryScore {
  const weight = 0.35; // 35% от общего score

  if (totalIncome === 0) {
    return {
      score: 0,
      weight,
      status: "poor",
      details: "Нет данных о доходах",
    };
  }

  // Норма сбережений
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;

  let score = 0;
  let status: CategoryScore["status"] = "poor";
  let details = "";

  if (savingsRate >= 20) {
    score = 100;
    status = "excellent";
    details = `Отличная норма сбережений: ${savingsRate.toFixed(1)}%`;
  } else if (savingsRate >= 10) {
    score = 75;
    status = "good";
    details = `Хорошая норма сбережений: ${savingsRate.toFixed(1)}%`;
  } else if (savingsRate >= 5) {
    score = 50;
    status = "fair";
    details = `Умеренная норма сбережений: ${savingsRate.toFixed(1)}%`;
  } else if (savingsRate > 0) {
    score = 25;
    status = "poor";
    details = `Низкая норма сбережений: ${savingsRate.toFixed(1)}%`;
  } else {
    score = 0;
    status = "poor";
    details = "Траты превышают доходы";
  }

  // Бонус за наличие активных целей
  const activePlans = plans.filter((p) => p.status === "active");
  if (activePlans.length > 0) {
    score = Math.min(100, score + 10);
    details += ` | ${activePlans.length} активных целей`;
  }

  return { score: Math.round(score), weight, status, details };
}

function calculateBudgetScore(expenses: any[], budgets: any[]): CategoryScore {
  const weight = 0.25; // 25% от общего score

  if (budgets.length === 0) {
    return {
      score: 50,
      weight,
      status: "fair",
      details: "Бюджеты не настроены",
    };
  }

  // Группируем расходы по категориям
  const expensesByCategory = new Map<string, number>();
  expenses.forEach((e) => {
    const categoryId = e.category_id;
    if (categoryId) {
      expensesByCategory.set(
        categoryId,
        (expensesByCategory.get(categoryId) || 0) + Math.abs(e.amount)
      );
    }
  });

  // Проверяем соблюдение бюджетов
  let totalBudgets = 0;
  let withinBudget = 0;

  budgets.forEach((budget) => {
    totalBudgets++;
    const spent = expensesByCategory.get(budget.category_id) || 0;
    const limit = budget.amount_limit;

    if (spent <= limit) {
      withinBudget++;
    }
  });

  const compliance = totalBudgets > 0 ? (withinBudget / totalBudgets) * 100 : 0;

  let score = 0;
  let status: CategoryScore["status"] = "poor";

  if (compliance >= 90) {
    score = 100;
    status = "excellent";
  } else if (compliance >= 70) {
    score = 75;
    status = "good";
  } else if (compliance >= 50) {
    score = 50;
    status = "fair";
  } else {
    score = 25;
    status = "poor";
  }

  return {
    score: Math.round(score),
    weight,
    status,
    details: `Соблюдение бюджета: ${compliance.toFixed(0)}% (${withinBudget}/${totalBudgets})`,
  };
}

function calculateDebtScore(expenses: any[]): CategoryScore {
  const weight = 0.2; // 20% от общего score

  // Ищем категории, связанные с долгами/кредитами
  const debtKeywords = ["кредит", "долг", "заем", "ипотека", "loan", "debt"];
  const debtExpenses = expenses.filter((e) => {
    const desc = (e.description || "").toLowerCase();
    return debtKeywords.some((keyword) => desc.includes(keyword));
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const totalDebt = debtExpenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);

  const debtRatio = totalExpenses > 0 ? (totalDebt / totalExpenses) * 100 : 0;

  let score = 0;
  let status: CategoryScore["status"] = "poor";
  let details = "";

  if (debtRatio === 0) {
    score = 100;
    status = "excellent";
    details = "Нет долговых обязательств";
  } else if (debtRatio < 10) {
    score = 85;
    status = "good";
    details = `Низкая долговая нагрузка: ${debtRatio.toFixed(1)}%`;
  } else if (debtRatio < 25) {
    score = 60;
    status = "fair";
    details = `Умеренная долговая нагрузка: ${debtRatio.toFixed(1)}%`;
  } else {
    score = 30;
    status = "poor";
    details = `Высокая долговая нагрузка: ${debtRatio.toFixed(1)}%`;
  }

  return { score: Math.round(score), weight, status, details };
}

function calculateStabilityScore(transactions: any[]): CategoryScore {
  const weight = 0.2; // 20% от общего score

  // Группируем по месяцам
  const monthlyIncome = new Map<string, number>();
  const monthlyExpenses = new Map<string, number>();

  transactions.forEach((t) => {
    const month = new Date(t.occurred_at).toISOString().slice(0, 7);
    const amount = Math.abs(t.amount);

    if (t.direction === "income") {
      monthlyIncome.set(month, (monthlyIncome.get(month) || 0) + amount);
    } else if (t.direction === "expense") {
      monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + amount);
    }
  });

  // Вычисляем коэффициент вариации
  const incomeValues = Array.from(monthlyIncome.values());
  const expenseValues = Array.from(monthlyExpenses.values());

  const incomeCv = calculateCV(incomeValues);
  const expenseCv = calculateCV(expenseValues);

  // Средний CV
  const avgCv = (incomeCv + expenseCv) / 2;

  let score = 0;
  let status: CategoryScore["status"] = "poor";
  let details = "";

  if (avgCv < 15) {
    score = 100;
    status = "excellent";
    details = "Очень стабильные финансы";
  } else if (avgCv < 30) {
    score = 75;
    status = "good";
    details = "Стабильные финансы";
  } else if (avgCv < 50) {
    score = 50;
    status = "fair";
    details = "Умеренная нестабильность";
  } else {
    score = 25;
    status = "poor";
    details = "Высокая нестабильность";
  }

  return { score: Math.round(score), weight, status, details };
}

function calculateCV(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return (stdDev / mean) * 100;
}

function getGrade(score: number): FinancialHealthReport["grade"] {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function generateInsights(
  overallScore: number,
  categories: {
    savings: CategoryScore;
    budget: CategoryScore;
    debt: CategoryScore;
    stability: CategoryScore;
  }
): string[] {
  const insights: string[] = [];

  // Общая оценка
  if (overallScore >= 80) {
    insights.push("🎉 Отличное финансовое здоровье! Продолжайте в том же духе.");
  } else if (overallScore >= 60) {
    insights.push("👍 Хорошее финансовое здоровье, но есть пространство для улучшения.");
  } else if (overallScore >= 40) {
    insights.push("⚠️ Умеренное финансовое здоровье. Рекомендуем обратить внимание на слабые места.");
  } else {
    insights.push("🚨 Финансовое здоровье требует внимания. Следуйте рекомендациям.");
  }

  // Лучшая категория
  const categoriesArray = Object.entries(categories);
  if (categoriesArray.length > 0) {
    const [bestName, best] = categoriesArray.reduce((max, current) =>
      current[1].score > max[1].score ? current : max
    );
    const bestNameRu = getCategoryNameRu(bestName);
    insights.push(`💪 Сильная сторона: ${bestNameRu} (${best.score} баллов)`);

    // Слабая категория
    const [worstName, worst] = categoriesArray.reduce((min, current) =>
      current[1].score < min[1].score ? current : min
    );
    const worstNameRu = getCategoryNameRu(worstName);
    insights.push(`📉 Требует внимания: ${worstNameRu} (${worst.score} баллов)`);
  }

  return insights;
}

function generateRecommendations(categories: {
  savings: CategoryScore;
  budget: CategoryScore;
  debt: CategoryScore;
  stability: CategoryScore;
}): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Сбережения
  if (categories.savings.score < 70) {
    recommendations.push({
      priority: "high",
      category: "Сбережения",
      title: "Увеличьте норму сбережений",
      description:
        "Стремитесь откладывать минимум 10-20% от дохода. Настройте автоматические переводы на сберегательный счёт.",
      impact: 15,
    });
  }

  // Бюджет
  if (categories.budget.score < 70) {
    recommendations.push({
      priority: categories.budget.score < 50 ? "high" : "medium",
      category: "Бюджет",
      title: "Соблюдайте установленные бюджеты",
      description:
        "Регулярно проверяйте расходы по категориям. Используйте уведомления о приближении к лимиту.",
      impact: 10,
    });
  }

  // Долги
  if (categories.debt.score < 70) {
    recommendations.push({
      priority: "high",
      category: "Долги",
      title: "Снизьте долговую нагрузку",
      description:
        "Составьте план погашения долгов. Рассмотрите возможность рефинансирования под более низкую ставку.",
      impact: 12,
    });
  }

  // Стабильность
  if (categories.stability.score < 70) {
    recommendations.push({
      priority: "medium",
      category: "Стабильность",
      title: "Создайте финансовую подушку",
      description:
        "Сформируйте резервный фонд на 3-6 месяцев расходов. Это поможет справиться с непредвиденными ситуациями.",
      impact: 8,
    });
  }

  // Общие рекомендации
  if (categories.budget.score === 50) {
    recommendations.push({
      priority: "medium",
      category: "Планирование",
      title: "Настройте бюджеты",
      description:
        "Создайте бюджеты для основных категорий расходов. Это поможет контролировать траты.",
      impact: 10,
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getCategoryNameRu(key: string): string {
  const map: Record<string, string> = {
    savings: "Сбережения",
    budget: "Бюджет",
    debt: "Долги",
    stability: "Стабильность",
  };
  return map[key] || key;
}

function getEmptyReport(): FinancialHealthReport {
  return {
    overall_score: 0,
    grade: "poor",
    categories: {
      savings: { score: 0, weight: 0.35, status: "poor", details: "Нет данных" },
      budget: { score: 0, weight: 0.25, status: "poor", details: "Нет данных" },
      debt: { score: 0, weight: 0.2, status: "poor", details: "Нет данных" },
      stability: { score: 0, weight: 0.2, status: "poor", details: "Нет данных" },
    },
    insights: ["Недостаточно данных для оценки"],
    recommendations: [],
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // green
  if (score >= 60) return "#3b82f6"; // blue
  if (score >= 40) return "#f59e0b"; // orange
  return "#dc2626"; // red
}

export function getGradeLabel(grade: FinancialHealthReport["grade"]): string {
  const map = {
    excellent: "Отлично",
    good: "Хорошо",
    fair: "Удовлетворительно",
    poor: "Плохо",
  };
  return map[grade];
}
