/**
 * Детектор активности для напоминаний о внесении транзакций
 * 
 * Отслеживает:
 * - Пропущенные дни без транзакций
 * - Обычный паттерн активности пользователя
 * - Напоминания о регулярных действиях
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityAlert {
  type: "missing_transactions" | "low_activity" | "reminder";
  severity: "medium" | "low";
  message: string;
  days_since_last: number;
  recommendation: string;
}

/**
 * Проверяет активность пользователя и генерирует напоминания
 */
export async function detectInactivity(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivityAlert | null> {
  // Получаем последнюю транзакцию
  const { data: lastTransaction } = await supabase
    .from("transactions")
    .select("occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastTransaction) {
    // Нет ни одной транзакции
    return {
      type: "reminder",
      severity: "medium",
      message: "Начните отслеживать свои финансы!",
      days_since_last: 0,
      recommendation: "Добавьте вашу первую транзакцию, чтобы начать контролировать бюджет.",
    };
  }

  const lastTransactionDate = new Date(lastTransaction.occurred_at);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));

  // Если последняя транзакция больше 3 дней назад
  if (daysSince >= 3) {
    // Анализируем типичную активность пользователя
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("occurred_at", { ascending: false });

    if (!recentTransactions || recentTransactions.length === 0) {
      return null;
    }

    // Средний интервал между транзакциями
    const intervals: number[] = [];
    for (let i = 1; i < recentTransactions.length; i++) {
      const prevDate = new Date(recentTransactions[i - 1].occurred_at);
      const currDate = new Date(recentTransactions[i].occurred_at);
      const daysBetween = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysBetween);
    }

    const avgInterval = intervals.length > 0 
      ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length 
      : 1;

    // Если текущий пропуск превышает средний интервал в 2 раза
    if (daysSince > avgInterval * 2 && daysSince >= 3) {
      const severity: ActivityAlert["severity"] = daysSince >= 7 ? "medium" : "low";

      return {
        type: "missing_transactions",
        severity,
        message: `Прошло ${daysSince} ${getDaysWord(daysSince)} с последней транзакции`,
        days_since_last: daysSince,
        recommendation: 
          daysSince >= 7
            ? "Не забывайте регулярно вносить транзакции для точного учёта финансов."
            : "Внесите последние транзакции, чтобы данные оставались актуальными.",
      };
    }
  }

  return null;
}

/**
 * Проверяет низкую активность в текущем месяце
 */
export async function detectLowActivity(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivityAlert | null> {
  const now = new Date();

  // Получаем транзакции за последние 2 месяца
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, date, amount")
    .eq("user_id", userId)
    .gte("date", twoMonthsAgo.toISOString().slice(0, 10));

  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Транзакции за текущий месяц
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  const currentMonthTransactions = transactions.filter((t) => new Date(t.date) >= currentMonthStart);
  const currentCount = currentMonthTransactions.length;

  // Транзакции прошлого месяца
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const { count: lastMonthCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("occurred_at", lastMonthStart.toISOString())
    .lte("occurred_at", lastMonthEnd.toISOString());

  // Если активность снизилась более чем в 2 раза
  if (lastMonthCount && currentCount < lastMonthCount / 2 && lastMonthCount >= 10) {
    const dayOfMonth = now.getDate();
    
    // Только после 10 числа месяца
    if (dayOfMonth >= 10) {
      return {
        type: "low_activity",
        severity: "low",
        message: `Активность снизилась: ${currentCount} транзакций в этом месяце (было ${lastMonthCount})`,
        days_since_last: 0,
        recommendation: "Проверьте, все ли транзакции внесены. Регулярный учёт помогает контролировать бюджет.",
      };
    }
  }

  return null;
}

function getDaysWord(days: number): string {
  if (days % 10 === 1 && days % 100 !== 11) {
    return "день";
  } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
    return "дня";
  } else {
    return "дней";
  }
}
