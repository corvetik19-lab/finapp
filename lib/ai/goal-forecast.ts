/**
 * Библиотека для прогнозирования достижения финансовых целей
 * 
 * Анализирует текущие планы пользователя и предсказывает:
 * - Когда будет достигнута цель
 * - Рекомендуемый размер ежемесячных взносов
 * - Прогресс по месяцам
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface Plan {
  id: string;
  name: string;
  goal_amount: number; // в копейках
  current_amount: number; // в копейках
  monthly_contribution: number; // в копейках
  target_date: string | null;
  created_at: string;
  plan_type: string;
}

export interface PlanTopup {
  amount: number;
  created_at: string;
}

export interface GoalForecast {
  plan_id: string;
  plan_name: string;
  goal_amount: number; // в копейках
  current_amount: number; // в копейках
  remaining_amount: number; // в копейках
  progress_percentage: number;
  
  // Текущие параметры
  current_monthly_contribution: number; // в копейках
  average_monthly_contribution: number; // в копейках (за последние 3 месяца)
  
  // Прогноз при текущих взносах
  estimated_completion_date: string | null;
  months_to_goal: number | null;
  
  // Рекомендации
  recommended_monthly_contribution: number; // в копейках
  target_date: string | null;
  months_until_target: number | null;
  
  // Сценарии
  scenarios: {
    conservative: GoalScenario; // Если снизить взносы на 30%
    current: GoalScenario; // При текущих взносах
    aggressive: GoalScenario; // Если увеличить взносы на 50%
  };
  
  // История
  topups_history: PlanTopup[];
  topups_count: number;
  
  // AI совет
  advice: string;
}

export interface GoalScenario {
  monthly_amount: number; // в копейках
  months_to_goal: number;
  completion_date: string;
}

export interface MonthlyProgress {
  month: string;
  projected_amount: number; // в копейках
  percentage: number;
}

/**
 * Рассчитывает прогноз достижения цели для одного плана
 */
export async function calculateGoalForecast(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<GoalForecast | null> {
  // Получаем план
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (planError || !plan) {
    console.error("Plan not found:", planError);
    return null;
  }

  // Получаем историю взносов за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: topups } = await supabase
    .from("plan_topups")
    .select("amount, created_at")
    .eq("plan_id", planId)
    .gte("created_at", threeMonthsAgo.toISOString())
    .order("created_at", { ascending: false });

  const topupsHistory = topups || [];
  const topupsCount = topupsHistory.length;

  // Расчет среднего взноса за последние 3 месяца
  const avgMonthlyContribution =
    topupsCount > 0
      ? Math.round(
          topupsHistory.reduce((sum, t) => sum + t.amount, 0) / 3
        )
      : plan.monthly_contribution || 0;

  const currentAmount = plan.current_amount || 0;
  const goalAmount = plan.goal_amount || 0;
  const remainingAmount = Math.max(0, goalAmount - currentAmount);
  const progressPercentage = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  // Прогноз при текущих взносах
  const monthsToGoal =
    avgMonthlyContribution > 0
      ? Math.ceil(remainingAmount / avgMonthlyContribution)
      : null;

  const estimatedCompletionDate = monthsToGoal
    ? addMonths(new Date(), monthsToGoal).toISOString().split("T")[0]
    : null;

  // Рекомендации на основе target_date
  let recommendedMonthlyContribution = avgMonthlyContribution;
  let monthsUntilTarget = null;

  if (plan.target_date) {
    const targetDate = new Date(plan.target_date);
    const now = new Date();
    monthsUntilTarget = Math.max(
      1,
      Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );

    if (monthsUntilTarget > 0 && remainingAmount > 0) {
      recommendedMonthlyContribution = Math.ceil(remainingAmount / monthsUntilTarget);
    }
  }

  // Сценарии
  const scenarios = {
    conservative: calculateScenario(
      currentAmount,
      goalAmount,
      Math.round(avgMonthlyContribution * 0.7)
    ),
    current: calculateScenario(currentAmount, goalAmount, avgMonthlyContribution),
    aggressive: calculateScenario(
      currentAmount,
      goalAmount,
      Math.round(avgMonthlyContribution * 1.5)
    ),
  };

  // AI совет
  const advice = generateAdvice(
    plan,
    currentAmount,
    goalAmount,
    avgMonthlyContribution,
    monthsToGoal,
    monthsUntilTarget
  );

  return {
    plan_id: plan.id,
    plan_name: plan.name,
    goal_amount: goalAmount,
    current_amount: currentAmount,
    remaining_amount: remainingAmount,
    progress_percentage: Math.round(progressPercentage * 10) / 10,
    current_monthly_contribution: plan.monthly_contribution || 0,
    average_monthly_contribution: avgMonthlyContribution,
    estimated_completion_date: estimatedCompletionDate,
    months_to_goal: monthsToGoal,
    recommended_monthly_contribution: recommendedMonthlyContribution,
    target_date: plan.target_date,
    months_until_target: monthsUntilTarget,
    scenarios,
    topups_history: topupsHistory,
    topups_count: topupsCount,
    advice,
  };
}

/**
 * Получает прогнозы для всех активных планов пользователя
 */
export async function getAllGoalForecasts(
  supabase: SupabaseClient,
  userId: string
): Promise<GoalForecast[]> {
  const { data: plans } = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!plans || plans.length === 0) {
    return [];
  }

  const forecasts = await Promise.all(
    plans.map((plan) => calculateGoalForecast(supabase, userId, plan.id))
  );

  return forecasts.filter((f): f is GoalForecast => f !== null);
}

/**
 * Рассчитывает сценарий достижения цели при заданном ежемесячном взносе
 */
function calculateScenario(
  currentAmount: number,
  goalAmount: number,
  monthlyAmount: number
): GoalScenario {
  const remaining = Math.max(0, goalAmount - currentAmount);
  const monthsToGoal =
    monthlyAmount > 0 ? Math.ceil(remaining / monthlyAmount) : 999;

  const completionDate = addMonths(new Date(), monthsToGoal)
    .toISOString()
    .split("T")[0];

  return {
    monthly_amount: monthlyAmount,
    months_to_goal: monthsToGoal,
    completion_date: completionDate,
  };
}

/**
 * Генерирует AI совет на основе анализа плана
 */
function generateAdvice(
  plan: Plan,
  currentAmount: number,
  goalAmount: number,
  avgMonthlyContribution: number,
  monthsToGoal: number | null,
  monthsUntilTarget: number | null
): string {
  const progressPercentage = goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0;

  // Если цель почти достигнута
  if (progressPercentage >= 90) {
    return `🎉 Отлично! Вы почти достигли своей цели "${plan.name}". Осталось накопить всего ${formatMoney(
      goalAmount - currentAmount
    )}!`;
  }

  // Если есть target_date и не успеваем
  if (monthsUntilTarget && monthsToGoal && monthsToGoal > monthsUntilTarget) {
    const diff = Math.round(
      (goalAmount - currentAmount) / monthsUntilTarget - avgMonthlyContribution
    );
    return `⚠️ Чтобы достичь цели "${plan.name}" к ${plan.target_date}, увеличьте ежемесячные взносы на ${formatMoney(
      diff
    )} (до ${formatMoney(avgMonthlyContribution + diff)}/мес).`;
  }

  // Если нет взносов
  if (avgMonthlyContribution === 0) {
    const recommended = Math.ceil((goalAmount - currentAmount) / 12);
    return `💡 Начните делать регулярные взносы! Рекомендуем откладывать ${formatMoney(
      recommended
    )}/мес для достижения цели "${plan.name}" за год.`;
  }

  // Если всё идёт по плану
  if (monthsToGoal && monthsToGoal <= 12) {
    return `✅ Отличный прогресс! При текущих взносах вы достигнете цели "${plan.name}" через ${monthsToGoal} мес (${
      monthsToGoal === 1 ? "месяц" : monthsToGoal < 5 ? "месяца" : "месяцев"
    }).`;
  }

  // Долгий путь
  if (monthsToGoal && monthsToGoal > 24) {
    const increase = Math.round(avgMonthlyContribution * 0.5);
    return `📈 Цель "${plan.name}" далека (${monthsToGoal} мес). Рекомендуем увеличить взносы на ${formatMoney(
      increase
    )} для ускорения прогресса.`;
  }

  return `💪 Продолжайте в том же духе! Вы на правильном пути к достижению цели "${plan.name}".`;
}

/**
 * Добавляет месяцы к дате
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
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
 * Генерирует прогресс по месяцам
 */
export function generateMonthlyProgress(
  currentAmount: number,
  goalAmount: number,
  monthlyContribution: number,
  months: number = 12
): MonthlyProgress[] {
  const progress: MonthlyProgress[] = [];
  let amount = currentAmount;

  for (let i = 1; i <= months; i++) {
    amount = Math.min(goalAmount, amount + monthlyContribution);
    const percentage = goalAmount > 0 ? (amount / goalAmount) * 100 : 0;
    const date = addMonths(new Date(), i);
    const month = date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
    });

    progress.push({
      month,
      projected_amount: Math.round(amount),
      percentage: Math.round(percentage * 10) / 10,
    });

    if (amount >= goalAmount) break;
  }

  return progress;
}
