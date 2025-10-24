import { generateText } from "ai";
import { getAnalyticsModel } from "./openrouter";

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
  type: "optimization" | "warning" | "opportunity" | "goal" | "automation" | "milestone";
  title: string;
  description: string;
  action_items: string[];
  impact: "high" | "medium" | "low";
  priority: number; // 1-10
  expected_result?: string; // Ожидаемый результат
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
    const savingsRate = context.monthly_income > 0 
      ? ((context.monthly_income - context.monthly_expense) / context.monthly_income * 100).toFixed(1)
      : "0";
    
    const leaksText = context.money_leaks.length > 0
      ? context.money_leaks.map(l => `${l.category}: ${(l.amount / 100).toFixed(0)} ₽/мес (${l.percentage_of_income.toFixed(1)}% дохода, потенциальная экономия: ${(l.potential_savings / 100).toFixed(0)} ₽)`).join("\n- ")
      : "нет значительных утечек";

    const prompt = `Ты опытный финансовый советник. Проанализируй финансовое состояние и дай РОВНО 5 персональных рекомендаций.

📊 ФИНАНСОВЫЕ ПОКАЗАТЕЛИ:
- Общий балл здоровья: ${context.health_score.overall_score}/100 (${context.health_score.grade})
- Ежемесячный доход: ${(context.monthly_income / 100).toFixed(0)} ₽
- Ежемесячный расход: ${(context.monthly_expense / 100).toFixed(0)} ₽
- Норма сбережений: ${savingsRate}%
- Проблемные категории (денежные утечки):
  ${leaksText}
${context.goals ? `- Финансовые цели: ${context.goals.join(", ")}` : ""}

🎯 ТРЕБОВАНИЯ К СОВЕТАМ:
1. РОВНО 5 советов (не больше, не меньше)
2. Конкретные и применимые на практике
3. Учитывай реальные показатели клиента
4. Приоритезируй по важности (1 = самый важный)
5. Укажи конкретные действия и ожидаемый эффект

📋 ФОРМАТ ОТВЕТА (только JSON, без текста):
[
  {
    "type": "optimization|warning|opportunity|goal|automation",
    "title": "Краткий заголовок (до 50 символов)",
    "description": "Подробное объяснение почему это важно и как это поможет (2-3 предложения)",
    "action_items": [
      "Конкретный шаг 1 с цифрами",
      "Конкретный шаг 2 с цифрами",
      "Конкретный шаг 3 с результатом"
    ],
    "impact": "high|medium|low",
    "priority": 1-5,
    "expected_result": "Ожидаемый результат (например: экономия 5000₽/мес)"
  }
]

ТИПЫ СОВЕТОВ:
- optimization: оптимизация расходов
- warning: предупреждение о рисках
- opportunity: возможность улучшения
- goal: достижение цели
- automation: автоматизация учёта

Только валидный JSON массив, без markdown, без текста до и после!`;

    const { text } = await generateText({
      model: getAnalyticsModel(),
      prompt,
      temperature: 0.7,
    });

    // Парсим JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const advice = JSON.parse(jsonMatch[0]);
      // Убеждаемся что вернулось ровно 5 советов
      return advice.slice(0, 5);
    }

    // Fallback: детальные рекомендации на основе данных
    const fallbackAdvice: FinancialAdvice[] = [];
    
    // 1. Норма сбережений
    if (parseFloat(savingsRate) < 20) {
      fallbackAdvice.push({
        type: "warning",
        title: "Увеличьте норму сбережений",
        description: `Ваша текущая норма сбережений ${savingsRate}% ниже рекомендуемых 20%. Это может создать риски в долгосрочной перспективе.`,
        action_items: [
          `Установите автоплатёж на отдельный счёт в размере ${(context.monthly_income * 0.2 / 100).toFixed(0)} ₽`,
          "Используйте правило 50/30/20: 50% на нужды, 30% на желания, 20% на сбережения",
          "Пересмотрите категорию 'желания' и сократите на 10%"
        ],
        impact: "high",
        priority: 1,
      });
    }

    // 2. Денежные утечки
    if (context.money_leaks.length > 0) {
      const topLeak = context.money_leaks[0];
      fallbackAdvice.push({
        type: "optimization",
        title: `Оптимизируйте расходы на "${topLeak.category}"`,
        description: `Вы тратите ${topLeak.percentage_of_income.toFixed(1)}% дохода на эту категорию. Потенциальная экономия: ${(topLeak.potential_savings / 100).toFixed(0)} ₽/мес.`,
        action_items: [
          `Установите бюджет ${(topLeak.amount * 0.7 / 100).toFixed(0)} ₽/мес на "${topLeak.category}"`,
          "Отслеживайте каждую транзакцию в этой категории 2 недели",
          `Найдите альтернативы и сократите расходы на 30% = ${(topLeak.potential_savings / 100).toFixed(0)} ₽/мес`
        ],
        impact: "high",
        priority: 2,
      });
    }

    // 3. Аварийный фонд
    fallbackAdvice.push({
      type: "goal",
      title: "Создайте финансовую подушку безопасности",
      description: "Аварийный фонд в размере 3-6 месячных расходов защитит от непредвиденных ситуаций.",
      action_items: [
        `Рассчитайте целевую сумму: ${(context.monthly_expense * 3 / 100).toFixed(0)} ₽ (минимум 3 месяца)`,
        `Откладывайте ${(context.monthly_income * 0.1 / 100).toFixed(0)} ₽/мес (10% дохода)`,
        "Храните фонд на отдельном депозите с доступом за 1-2 дня"
      ],
      impact: "high",
      priority: 3,
    });

    // 4. Автоматизация
    fallbackAdvice.push({
      type: "automation",
      title: "Автоматизируйте финансовый учёт",
      description: "Регулярный учёт всех транзакций позволит принимать обоснованные решения и выявлять проблемы заранее.",
      action_items: [
        "Вносите каждую транзакцию сразу после покупки",
        "Проверяйте бюджеты 2 раза в месяц (1-го и 15-го числа)",
        "Настройте уведомления о приближении к лимитам"
      ],
      impact: "medium",
      priority: 4,
    });

    // 5. Долгосрочное планирование
    fallbackAdvice.push({
      type: "opportunity",
      title: "Создайте финансовый план на год",
      description: "Планирование крупных расходов и целей поможет избежать финансовых стрессов и достичь желаемого.",
      action_items: [
        "Составьте список целей на год с приоритетами",
        `Рассчитайте необходимые ежемесячные взносы для каждой цели`,
        "Используйте раздел 'Планы' для отслеживания прогресса"
      ],
      impact: "medium",
      priority: 5,
    });

    return fallbackAdvice.slice(0, 5);
  } catch (error) {
    console.error("AI advice generation error:", error);
    
    // Минимальный fallback
    return [
      {
        type: "optimization",
        title: "Оптимизируйте бюджет",
        description: "Проанализируйте крупные категории расходов и найдите возможности для экономии.",
        action_items: [
          "Просмотрите детализацию трат за последний месяц",
          "Определите необязательные расходы",
          "Установите бюджеты на основные категории"
        ],
        impact: "medium",
        priority: 1,
      },
    ];
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
