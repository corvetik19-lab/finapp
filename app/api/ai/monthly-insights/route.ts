import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { getOpenRouterClient } from "@/lib/ai/openrouter-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Тип для транзакции с категорией
interface TransactionWithCategory {
  amount: number;
  direction: "income" | "expense" | "transfer";
  date: string;
  categories?: {
    name: string;
    type: string;
  } | null;
}

/**
 * CRON endpoint: Генерация ежемесячных AI инсайтов
 * Запускается 1-го числа каждого месяца в 9:00
 * Vercel Cron: 0 9 1 * *
 */
export async function GET(request: Request) {
  try {
    // Проверка авторизации CRON (Vercel)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createRSCClient();

    // Получить всех пользователей
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name");

    if (usersError || !users) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const results = [];

    // Генерация инсайтов для каждого пользователя
    for (const user of users) {
      try {
        // Получить транзакции пользователя за прошлый месяц
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const startOfMonth = new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth(),
          1
        );
        const endOfMonth = new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth() + 1,
          0
        );

        const { data: transactions } = await supabase
          .from("transactions")
          .select("*, categories(name, type)")
          .eq("user_id", user.id)
          .gte("date", startOfMonth.toISOString())
          .lte("date", endOfMonth.toISOString())
          .order("date", { ascending: false });

        if (!transactions || transactions.length === 0) {
          continue; // Нет транзакций за месяц
        }

        // Подготовить данные для AI
        const income = transactions
          .filter((t: TransactionWithCategory) => t.direction === "income")
          .reduce((sum: number, t: TransactionWithCategory) => sum + t.amount, 0);
        const expenses = transactions
          .filter((t: TransactionWithCategory) => t.direction === "expense")
          .reduce((sum: number, t: TransactionWithCategory) => sum + t.amount, 0);

        // Группировка по категориям
        const categoryBreakdown: Record<
          string,
          { count: number; total: number }
        > = {};
        transactions
          .filter((t: TransactionWithCategory) => t.direction === "expense")
          .forEach((t: TransactionWithCategory) => {
            const catName =
              t.categories?.name || "Без категории";
            if (!categoryBreakdown[catName]) {
              categoryBreakdown[catName] = { count: 0, total: 0 };
            }
            categoryBreakdown[catName].count++;
            categoryBreakdown[catName].total += t.amount;
          });

        // Отсортировать категории по сумме
        const topCategories = Object.entries(categoryBreakdown)
          .sort(([, a], [, b]) => b.total - a.total)
          .slice(0, 5);

        // Создать промпт для GPT
        const prompt = `Ты финансовый аналитик. Проанализируй расходы пользователя за ${lastMonth.toLocaleString("ru-RU", { month: "long", year: "numeric" })}.

Данные:
- Доход: ${(income / 100).toLocaleString("ru-RU")} ₽
- Расход: ${(expenses / 100).toLocaleString("ru-RU")} ₽
- Баланс: ${((income - expenses) / 100).toLocaleString("ru-RU")} ₽
- Количество транзакций: ${transactions.length}

Топ категорий расходов:
${topCategories.map(([cat, data]) => `- ${cat}: ${(data.total / 100).toLocaleString("ru-RU")} ₽ (${data.count} транзакций)`).join("\n")}

Создай краткий персонализированный отчёт (максимум 300 слов):
1. Основные наблюдения
2. Сравнение с предыдущим месяцем (если есть данные)
3. Рекомендации по оптимизации расходов
4. Положительные моменты

Тон: дружелюбный, мотивирующий, конкретный.`;

        const client = getOpenRouterClient();

        const response = await client.chat([
          {
            role: "system",
            content: "Ты профессиональный финансовый консультант, помогаешь людям управлять личными финансами.",
          },
          {
            role: "user",
            content: prompt,
          },
        ], {
          temperature: 0.7,
        });

        const summary = response.choices[0]?.message?.content || "Не удалось сгенерировать инсайт";

        // Сохранить инсайт в БД
        const { error: insertError } = await supabase
          .from("ai_summaries")
          .insert({
            user_id: user.id,
            summary_type: "monthly_insights",
            summary_text: summary || "Не удалось сгенерировать инсайт",
            period_start: startOfMonth.toISOString(),
            period_end: endOfMonth.toISOString(),
            metadata: {
              income: income / 100,
              expenses: expenses / 100,
              balance: (income - expenses) / 100,
              transactions_count: transactions.length,
              top_categories: topCategories.map(([cat, data]) => ({
                category: cat,
                amount: data.total / 100,
                count: data.count,
              })),
            },
          });

        if (insertError) {
          console.error(
            `Error saving insight for user ${user.id}:`,
            insertError
          );
          results.push({
            user_id: user.id,
            email: user.email,
            status: "error",
            error: insertError.message,
          });
        } else {
          results.push({
            user_id: user.id,
            email: user.email,
            status: "success",
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.push({
          user_id: user.id,
          email: user.email,
          status: "error",
          error: (userError as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Monthly insights generated",
      results,
      processed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
    });
  } catch (error) {
    console.error("Error in monthly-insights CRON:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
