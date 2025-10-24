import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Детекторы достижений
 * Проверяют выполнение условий и разблокируют достижения
 */

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number | null;
  points: number;
  rarity: string;
}

export interface UserAchievement {
  achievement: Achievement;
  unlocked_at: string;
  progress: number;
}

/**
 * Проверка и разблокировка достижений после добавления транзакции
 */
export async function checkTransactionAchievements(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Получаем количество транзакций пользователя
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const transactionCount = count || 0;

  // Проверяем достижения по количеству транзакций
  const achievementCodes = [];
  if (transactionCount >= 1) achievementCodes.push("first_transaction");
  if (transactionCount >= 10) achievementCodes.push("transactions_10");
  if (transactionCount >= 50) achievementCodes.push("transactions_50");
  if (transactionCount >= 100) achievementCodes.push("transactions_100");
  if (transactionCount >= 500) achievementCodes.push("transactions_500");

  // Разблокируем достижения
  for (const code of achievementCodes) {
    await unlockAchievement(userId, code);
  }

  // Обновляем стрик
  await updateStreak(userId);
}

/**
 * Проверка достижений по бюджетам
 */
export async function checkBudgetAchievements(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { count } = await supabase
    .from("budgets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const budgetCount = count || 0;

  if (budgetCount >= 1) await unlockAchievement(userId, "first_budget");
  if (budgetCount >= 5) await unlockAchievement(userId, "budget_master");
}

/**
 * Проверка достижений по целям
 */
export async function checkGoalAchievements(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { count } = await supabase
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count || 0) >= 1) {
    await unlockAchievement(userId, "first_goal");
  }
}

/**
 * Проверка достижений по AI
 */
export async function checkAIAchievements(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { count } = await supabase
    .from("ai_summaries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count || 0) >= 1) {
    await unlockAchievement(userId, "ai_first_chat");
  }
}

/**
 * Разблокировка достижения
 */
export async function unlockAchievement(userId: string, achievementCode: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Получаем достижение
  const { data: achievement } = await supabase
    .from("achievements")
    .select("*")
    .eq("code", achievementCode)
    .single();

  if (!achievement) return null;

  // Проверяем, не разблокировано ли уже
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .eq("achievement_id", achievement.id)
    .single();

  if (existing) return null; // Уже разблокировано

  // Разблокируем
  const { data: unlocked, error } = await supabase
    .from("user_achievements")
    .insert({
      user_id: userId,
      achievement_id: achievement.id,
      progress: achievement.requirement_value || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to unlock achievement:", error);
    return null;
  }

  // Начисляем XP
  await addXP(userId, achievement.points);

  return { achievement, unlocked_at: unlocked.unlocked_at };
}

/**
 * Обновление стрика пользователя
 */
export async function updateStreak(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split("T")[0];

  // Получаем текущий стрик
  let { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!streak) {
    // Создаём новый стрик
    const { data: newStreak } = await supabase
      .from("user_streaks")
      .insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        total_active_days: 1,
      })
      .select()
      .single();

    streak = newStreak;
  } else {
    const lastDate = streak.last_activity_date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate === today) {
      // Уже активен сегодня
      return streak;
    } else if (lastDate === yesterdayStr) {
      // Продолжаем стрик
      const newStreak = streak.current_streak + 1;
      const longestStreak = Math.max(newStreak, streak.longest_streak);

      await supabase
        .from("user_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
          total_active_days: streak.total_active_days + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      // Проверяем достижения по стрикам
      if (newStreak >= 7) await unlockAchievement(userId, "streak_7");
      if (newStreak >= 30) await unlockAchievement(userId, "streak_30");
      if (newStreak >= 100) await unlockAchievement(userId, "streak_100");
    } else {
      // Стрик прервался
      await supabase
        .from("user_streaks")
        .update({
          current_streak: 1,
          last_activity_date: today,
          total_active_days: streak.total_active_days + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  return streak;
}

/**
 * Начисление XP пользователю
 */
export async function addXP(userId: string, xp: number) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Получаем текущий уровень
  const { data: level } = await supabase
    .from("user_levels")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!level) {
    // Создаём новый уровень
    const { data: newLevel } = await supabase
      .from("user_levels")
      .insert({
        user_id: userId,
        level: 1,
        xp: xp,
        xp_to_next_level: 100,
        total_xp: xp,
      })
      .select()
      .single();

    return newLevel;
  }

  // Обновляем XP
  const newXP = level.xp + xp;
  const newTotalXP = level.total_xp + xp;

  await supabase
    .from("user_levels")
    .update({
      xp: newXP,
      total_xp: newTotalXP,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { ...level, xp: newXP, total_xp: newTotalXP };
}

/**
 * Получение всех достижений пользователя
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from("user_achievements")
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  return (data || []).map((item) => ({
    achievement: item.achievement,
    unlocked_at: item.unlocked_at,
    progress: item.progress,
  })) as UserAchievement[];
}

/**
 * Получение прогресса по всем достижениям
 */
export async function getAchievementsProgress(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Все достижения
  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")
    .order("category", { ascending: true });

  // Разблокированные достижения
  const { data: unlockedAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at, progress")
    .eq("user_id", userId);

  const unlockedMap = new Map(
    (unlockedAchievements || []).map((item) => [item.achievement_id, item])
  );

  return (allAchievements || []).map((achievement) => {
    const unlocked = unlockedMap.get(achievement.id);
    return {
      ...achievement,
      unlocked: !!unlocked,
      unlocked_at: unlocked?.unlocked_at,
      progress: unlocked?.progress || 0,
    };
  });
}
