import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * AI Финансовый советник - комплексный анализ финансового здоровья
 */

export interface FinancialHealthScore {
  overall_score: number; // 0-100
  breakdown: {
    savings_rate: number; // 0-100
    expense_stability: number; // 0-100
    budget_adherence: number; // 0-100
    debt_management: number; // 0-100
    emergency_fund: number; // 0-100
  };
  grade: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
}

export interface MoneyLeak {
  category: string;
  amount: number;
  percentage_of_income: number;
  recommendation: string;
  potential_savings: number;
}

export interface FinancialAdvice {
  type: "optimization" | "warning" | "opportunity" | "milestone";
  title: string;
  description: string;
  action_items: string[];
  impact: "high" | "medium" | "low";
  priority: number; // 1-10
}

export interface IdealBudget {
  needs: number; // % (housing, utilities, food, transport)
  wants: number; // % (entertainment, dining, shopping)
  savings: number; // % (emergency fund, investments, goals)
  user_actual: {
    needs: number;
    wants: number;
    savings: number;
  };
  recommendations: string[];
}

/**
 * Расчёт финансового здоровья
 */
export function calculateFinancialHealth(data: {
  monthly_income: number;
  monthly_expense: number;
  monthly_savings: number;
  emergency_fund: number;
  total_debt: number;
  budget_compliance_rate: number; // 0-100%
  expense_variance: number; // коэффициент вариации
}): FinancialHealthScore {
  const {
    monthly_income,
    monthly_expense,
    monthly_savings,
    emergency_fund,
    total_debt,
    budget_compliance_rate,
    expense_variance,
  } = data;

  // 1. Savings Rate (20% weight)
  const savingsRate = monthly_income > 0 ? (monthly_savings / monthly_income) * 100 : 0;
  let savingsScore = 0;
  if (savingsRate >= 30) savingsScore = 100;
  else if (savingsRate >= 20) savingsScore = 80;
  else if (savingsRate >= 10) savingsScore = 60;
  else if (savingsRate >= 5) savingsScore = 40;
  else savingsScore = 20;

  // 2. Expense Stability (15% weight)
  // Меньше вариация = лучше
  const stabilityScore = Math.max(0, Math.min(100, 100 - expense_variance * 100));

  // 3. Budget Adherence (20% weight)
  const budgetScore = budget_compliance_rate;

  // 4. Debt Management (25% weight)
  const monthlyDebtRatio = monthly_income > 0 ? (total_debt / monthly_income) : 0;
  let debtScore = 100;
  if (monthlyDebtRatio > 10) debtScore = 20;
  else if (monthlyDebtRatio > 5) debtScore = 40;
  else if (monthlyDebtRatio > 3) debtScore = 60;
  else if (monthlyDebtRatio > 1) debtScore = 80;

  // 5. Emergency Fund (20% weight)
  const monthsOfExpenses = monthly_expense > 0 ? emergency_fund / monthly_expense : 0;
  let emergencyScore = 0;
  if (monthsOfExpenses >= 6) emergencyScore = 100;
  else if (monthsOfExpenses >= 3) emergencyScore = 70;
  else if (monthsOfExpenses >= 1) emergencyScore = 40;
  else emergencyScore = 20;

  // Overall Score
  const overallScore = Math.round(
    savingsScore * 0.2 +
    stabilityScore * 0.15 +
    budgetScore * 0.2 +
    debtScore * 0.25 +
    emergencyScore * 0.2
  );

  let grade: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  if (overallScore >= 85) grade = "Excellent";
  else if (overallScore >= 70) grade = "Good";
  else if (overallScore >= 50) grade = "Fair";
  else if (overallScore >= 30) grade = "Poor";
  else grade = "Critical";

  return {
    overall_score: overallScore,
    breakdown: {
      savings_rate: Math.round(savingsScore),
      expense_stability: Math.round(stabilityScore),
      budget_adherence: Math.round(budgetScore),
      debt_management: Math.round(debtScore),
      emergency_fund: Math.round(emergencyScore),
    },
    grade,
  };
}

/**
 * Выявление "денежных утечек"
 */
export function detectMoneyLeaks(
  categoryExpenses: { category: string; amount: number }[],
  monthlyIncome: number,
  benchmarks: { [key: string]: number } // % от дохода
): MoneyLeak[] {
  const leaks: MoneyLeak[] = [];

  categoryExpenses.forEach(({ category, amount }) => {
    const percentage = (amount / monthlyIncome) * 100;
    const benchmark = benchmarks[category.toLowerCase()] || 100; // если нет бенчмарка, не считаем утечкой

    if (percentage > benchmark) {
      const excess = amount - (monthlyIncome * benchmark) / 100;
      leaks.push({
        category,
        amount,
        percentage_of_income: percentage,
        recommendation: generateLeakRecommendation(category, percentage, benchmark),
        potential_savings: excess,
      });
    }
  });

  return leaks.sort((a, b) => b.potential_savings - a.potential_savings);
}

function generateLeakRecommendation(
  category: string,
  actual: number,
  benchmark: number
): string {
  const excess = actual - benchmark;
  return `Вы тратите ${actual.toFixed(1)}% дохода на ${category}, что на ${excess.toFixed(1)}% больше рекомендуемого. Рассмотрите оптимизацию этой категории.`;
}

/**
 * Сравнение с "идеальным" бюджетом (правило 50/30/20)
 */
export function compareWithIdealBudget(
  needs: number,
  wants: number,
  savings: number
): IdealBudget {
  const recommendations: string[] = [];

  if (needs > 50) {
    recommendations.push(
      `Необходимые расходы составляют ${needs.toFixed(0)}% (идеал: 50%). Рассмотрите переезд в более доступное жилье или оптимизацию коммунальных платежей.`
    );
  }

  if (wants > 30) {
    recommendations.push(
      `Необязательные траты составляют ${wants.toFixed(0)}% (идеал: 30%). Есть потенциал для сокращения развлечений, подписок и кафе.`
    );
  }

  if (savings < 20) {
    recommendations.push(
      `Накопления составляют только ${savings.toFixed(0)}% (идеал: 20%). Увеличьте норму сбережений для финансовой стабильности.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Ваш бюджет близок к оптимальному! Продолжайте в том же духе.");
  }

  return {
    needs: 50,
    wants: 30,
    savings: 20,
    user_actual: { needs, wants, savings },
    recommendations,
  };
}

/**
 * AI генерация персонализированных советов
 */
export async function generatePersonalizedAdvice(context: {
  health_score: FinancialHealthScore;
  money_leaks: MoneyLeak[];
  monthly_income: number;
  monthly_expense: number;
  goals?: string[];
}): Promise<FinancialAdvice[]> {
  try {
    const prompt = `Ты финансовый советник. На основе анализа дай 3-5 конкретных практических советов.

Финансовые показатели:
- Общий балл здоровья: ${context.health_score.overall_score}/100 (${context.health_score.grade})
- Доход: ${(context.monthly_income / 100).toFixed(0)} ₽/мес
- Расход: ${(context.monthly_expense / 100).toFixed(0)} ₽/мес
- Проблемные категории: ${context.money_leaks.map(l => `${l.category} (${l.percentage_of_income.toFixed(1)}% дохода)`).join(", ") || "нет"}
${context.goals ? `- Цели: ${context.goals.join(", ")}` : ""}

Дай конкретные советы в формате JSON массива:
[
  {
    "type": "optimization|warning|opportunity",
    "title": "Заголовок совета",
    "description": "Подробное описание",
    "action_items": ["Шаг 1", "Шаг 2"],
    "impact": "high|medium|low",
    "priority": 1-10
  }
]

Только JSON, без дополнительного текста.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
    });

    // Парсим JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return [
      {
        type: "optimization",
        title: "Оптимизируйте бюджет",
        description: "Проанализируйте крупные категории расходов",
        action_items: ["Просмотрите детализацию трат", "Определите необязательные расходы"],
        impact: "medium",
        priority: 5,
      },
    ];
  } catch (error) {
    console.error("AI advice generation error:", error);
    return [];
  }
}

/**
 * Пошаговый план достижения целей
 */
export function generateActionPlan(
  currentState: {
    monthly_savings: number;
    debt: number;
    emergency_fund: number;
  },
  goals: {
    target_savings?: number;
    pay_off_debt?: boolean;
    build_emergency_fund?: number; // месяцев расходов
  },
  monthlyIncome: number,
  monthlyExpense: number
): {
  steps: { step: number; title: string; description: string; duration_months: number }[];
  total_months: number;
} {
  const steps: { step: number; title: string; description: string; duration_months: number }[] = [];
  let totalMonths = 0;
  let stepNum = 1;

  // 1. Аварийный фонд (приоритет 1)
  if (goals.build_emergency_fund) {
    const targetAmount = monthlyExpense * goals.build_emergency_fund;
    const needed = Math.max(0, targetAmount - currentState.emergency_fund);
    const monthsNeeded = currentState.monthly_savings > 0 
      ? Math.ceil(needed / currentState.monthly_savings)
      : Infinity;

    if (monthsNeeded < Infinity) {
      steps.push({
        step: stepNum++,
        title: `Создать аварийный фонд на ${goals.build_emergency_fund} мес`,
        description: `Накопите ${(needed / 100).toFixed(0)} ₽ для финансовой подушки безопасности`,
        duration_months: monthsNeeded,
      });
      totalMonths += monthsNeeded;
    }
  }

  // 2. Погашение долгов (приоритет 2)
  if (goals.pay_off_debt && currentState.debt > 0) {
    const monthsNeeded = currentState.monthly_savings > 0
      ? Math.ceil(currentState.debt / currentState.monthly_savings)
      : Infinity;

    if (monthsNeeded < Infinity) {
      steps.push({
        step: stepNum++,
        title: "Погасить долги",
        description: `Избавьтесь от ${(currentState.debt / 100).toFixed(0)} ₽ долга`,
        duration_months: monthsNeeded,
      });
      totalMonths += monthsNeeded;
    }
  }

  // 3. Достижение целевых накоплений (приоритет 3)
  if (goals.target_savings) {
    const alreadySaved = currentState.emergency_fund;
    const needed = Math.max(0, goals.target_savings - alreadySaved);
    const monthsNeeded = currentState.monthly_savings > 0
      ? Math.ceil(needed / currentState.monthly_savings)
      : Infinity;

    if (monthsNeeded < Infinity) {
      steps.push({
        step: stepNum++,
        title: "Достичь целевых накоплений",
        description: `Накопите еще ${(needed / 100).toFixed(0)} ₽ для ваших целей`,
        duration_months: monthsNeeded,
      });
      totalMonths += monthsNeeded;
    }
  }

  if (steps.length === 0) {
    steps.push({
      step: 1,
      title: "Увеличить доходы или сократить расходы",
      description: "Текущий баланс не позволяет двигаться к целям",
      duration_months: 0,
    });
  }

  return { steps, total_months: totalMonths };
}
