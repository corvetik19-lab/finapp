import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/onboarding/checklist - получить статус чек-листа
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем выполнение каждого пункта
    const checks = await Promise.all([
      checkAccounts(supabase, user.id),
      checkTransactions(supabase, user.id),
      checkCategories(supabase, user.id),
      checkBudgets(supabase, user.id),
      checkAIUsage(supabase, user.id),
    ]);

    const items = [
      {
        id: "add_account",
        title: "Добавить счёт",
        description: "Создайте первый счёт (наличные, карта или банк)",
        completed: checks[0],
        action: "/accounts",
        icon: "💳",
      },
      {
        id: "add_transaction",
        title: "Добавить транзакцию",
        description: "Запишите первый доход или расход",
        completed: checks[1],
        action: "/transactions",
        icon: "💰",
      },
      {
        id: "create_category",
        title: "Создать категорию",
        description: "Настройте категории под свои нужды",
        completed: checks[2],
        action: "/categories",
        icon: "📂",
      },
      {
        id: "set_budget",
        title: "Установить бюджет",
        description: "Создайте первый бюджет для контроля трат",
        completed: checks[3],
        action: "/budgets",
        icon: "🎯",
      },
      {
        id: "try_ai",
        title: "Попробовать AI",
        description: "Задайте вопрос AI помощнику о ваших финансах",
        completed: checks[4],
        action: "/finance/ai-chat",
        icon: "🤖",
      },
    ];

    const all_completed = items.every((item) => item.completed);

    return NextResponse.json({ items, all_completed });
  } catch (error) {
    console.error("GET /api/onboarding/checklist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/onboarding/checklist - отметить пункт как выполненный
export async function PUT(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { item_id, completed } = body;

    // Сохраняем в метаданных пользователя
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        [`checklist_${item_id}`]: completed,
        checklist_updated_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      console.error("Failed to update checklist:", updateError);
      return NextResponse.json(
        { error: "Failed to update checklist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/onboarding/checklist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Вспомогательные функции для проверки выполнения

async function checkAccounts(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}

async function checkTransactions(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}

async function checkCategories(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}

async function checkBudgets(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("budgets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}

async function checkAIUsage(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // Проверяем, есть ли AI summaries
  const { count } = await supabase
    .from("ai_summaries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}
