import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  detectSpendingAnomaly,
  detectMissingTransactions,
  checkBudgetStatus,
  generateFinancialInsight,
} from "@/lib/ai/patterns";

// Service role client для CRON задач
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * CRON задача: Генерация умных уведомлений
 * Запускается ежедневно в 09:00
 */
export async function GET(request: Request) {
  try {
    // Проверка auth токена для CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();
    const results = {
      processed: 0,
      notifications: 0,
      errors: 0,
    };

    // Получаем всех пользователей с активными настройками уведомлений
    const { data: users, error: usersError } = await supabase
      .from("notification_preferences")
      .select("user_id, overspend_alerts, budget_warnings, missing_transaction_reminders, ai_insights")
      .eq("notification_frequency", "daily");

    if (usersError) throw usersError;

    for (const userPrefs of users || []) {
      try {
        results.processed++;
        const userId = userPrefs.user_id;

        // 1. Проверка аномалий в тратах (если включено)
        if (userPrefs.overspend_alerts) {
          await checkOverspending(supabase, userId);
          results.notifications++;
        }

        // 2. Проверка бюджетов (если включено)
        if (userPrefs.budget_warnings) {
          await checkBudgets(supabase, userId);
          results.notifications++;
        }

        // 3. Проверка забытых транзакций (если включено)
        if (userPrefs.missing_transaction_reminders) {
          await checkMissingTransactions(supabase, userId);
          results.notifications++;
        }

        // 4. Генерация AI инсайтов (если включено)
        if (userPrefs.ai_insights) {
          await generateInsights(supabase, userId);
          results.notifications++;
        }
      } catch (error) {
        console.error(`Error processing user ${userPrefs.user_id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("CRON smart notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Проверка аномалий в тратах
 */
async function checkOverspending(supabase: SupabaseClient, userId: string) {
  // Получаем траты за последний месяц по категориям
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("amount, category_id, categories!inner(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("date", oneMonthAgo.toISOString().split("T")[0]);

  // Группируем по категориям
  const categoryMap = new Map<string, { total: number; name: string; id: string }>();
  
  (recentTransactions || []).forEach((t: { category_id: string; amount: number; categories?: Array<{ name: string }> }) => {
    const catId = t.category_id;
    const catName = t.categories?.[0]?.name || "Без категории";
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { total: 0, name: catName, id: catId });
    }
    categoryMap.get(catId)!.total += t.amount;
  });

  // Для каждой категории проверяем аномалию
  for (const [catId, data] of categoryMap.entries()) {
    // Получаем исторические данные (предыдущие 3 месяца)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 4);

    const { data: historical } = await supabase
      .from("transactions")
      .select("amount, date")
      .eq("user_id", userId)
      .eq("category_id", catId)
      .eq("direction", "expense")
      .gte("date", threeMonthsAgo.toISOString().split("T")[0])
      .lt("date", oneMonthAgo.toISOString().split("T")[0]);

    if ((historical || []).length >= 3) {
      const analysis = await detectSpendingAnomaly(
        data.name,
        data.total,
        (historical || []).map((h: { amount: number; date: string }) => ({ amount: h.amount, date: h.date }))
      );

      if (analysis.isAnomaly) {
        // Создаём уведомление
        await supabase.from("smart_notifications").insert({
          user_id: userId,
          type: "overspend",
          title: `Необычные траты: ${data.name}`,
          message: analysis.message,
          severity: analysis.severity === "high" ? "alert" : "warning",
          category_id: catId,
          action_url: `/transactions?category=${catId}`,
          metadata: {
            recommendation: analysis.recommendation,
            amount: data.total,
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней
        });
      }
    }
  }
}

/**
 * Проверка бюджетов
 */
async function checkBudgets(supabase: SupabaseClient, userId: string) {
  const now = new Date();

  // Получаем активные бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select(`
      id,
      amount,
      spent,
      category_id,
      categories!inner(name)
    `)
    .eq("user_id", userId)
    .gte("period_end", now.toISOString().split("T")[0]);

  for (const budget of budgets || []) {
    const status = checkBudgetStatus(
      budget.spent,
      budget.amount,
      budget.categories?.[0]?.name || "Без категории"
    );

    if (status.status !== "ok") {
      // Проверяем, не создавали ли мы уже уведомление об этом бюджете сегодня
      const { data: existing } = await supabase
        .from("smart_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "budget_warning")
        .eq("related_entity_id", budget.id)
        .gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString())
        .single();

      if (!existing) {
        await supabase.from("smart_notifications").insert({
          user_id: userId,
          type: "budget_warning",
          title: `Бюджет: ${budget.categories?.[0]?.name}`,
          message: status.message,
          severity: status.status === "exceeded" ? "alert" : "warning",
          category_id: budget.category_id,
          related_entity_type: "budget",
          related_entity_id: budget.id,
          action_url: `/budgets`,
          metadata: {
            percentage: status.percentage,
          },
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 дня
        });
      }
    }
  }
}

/**
 * Проверка забытых транзакций
 */
async function checkMissingTransactions(supabase: SupabaseClient, userId: string) {
  const { data: lastTransaction } = await supabase
    .from("transactions")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (lastTransaction) {
    const detection = detectMissingTransactions(new Date(lastTransaction.date));

    if (detection.isMissing) {
      // Проверяем, не напоминали ли уже
      const { data: existing } = await supabase
        .from("smart_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "missing_transaction")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existing) {
        await supabase.from("smart_notifications").insert({
          user_id: userId,
          type: "missing_transaction",
          title: "Напоминание о транзакциях",
          message: detection.message,
          severity: "info",
          action_url: `/transactions`,
          metadata: {
            daysSince: detection.daysSince,
          },
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 дня
        });
      }
    }
  }
}

/**
 * Генерация AI инсайтов
 */
async function generateInsights(supabase: SupabaseClient, userId: string) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Получаем данные за месяц
  const { data: transactions } = await supabase
    .from("transactions")
    .select("direction, amount, categories!inner(name)")
    .eq("user_id", userId)
    .gte("date", oneMonthAgo.toISOString().split("T")[0]);

  if (!transactions || transactions.length === 0) return;

  const totalIncome = transactions
    .filter((t: { direction: string }) => t.direction === "income")
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t: { direction: string }) => t.direction === "expense")
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Топ категории
  const categoryMap = new Map<string, number>();
  transactions
    .filter((t: { direction: string }) => t.direction === "expense")
    .forEach((t: { amount: number; categories?: Array<{ name: string }> }) => {
      const name = t.categories?.[0]?.name || "Без категории";
      categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount);
    });

  const topCategories = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Генерируем инсайт
  try {
    const insight = await generateFinancialInsight({
      totalIncome,
      totalExpense,
      savingsRate,
      topCategories,
      budgetStatus: savingsRate > 20 ? "Отлично" : savingsRate > 10 ? "Хорошо" : "Нужно улучшить",
    });

    // Проверяем, не создавали ли инсайт сегодня
    const today = new Date();
    const { data: existing } = await supabase
      .from("smart_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "insight")
      .gte("created_at", new Date(today.setHours(0, 0, 0, 0)).toISOString())
      .single();

    if (!existing && insight) {
      await supabase.from("smart_notifications").insert({
        user_id: userId,
        type: "insight",
        title: "💡 Финансовый инсайт",
        message: insight,
        severity: "info",
        action_url: `/analytics/advanced`,
        metadata: {
          savingsRate,
          totalIncome,
          totalExpense,
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней
      });
    }
  } catch (error) {
    console.error("Failed to generate insight:", error);
  }
}
