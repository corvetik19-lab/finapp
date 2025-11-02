import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    
    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { distributions } = body;

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return NextResponse.json({ error: "Invalid distributions" }, { status: 400 });
    }

    // Создаем транзакции для каждого распределения
    const transactions = distributions.map((dist: { accountId: string; amount: number }) => ({
      user_id: user.id,
      account_id: dist.accountId,
      amount: dist.amount, // уже в копейках
      direction: "income" as const,
      note: "Распределение экономии",
      occurred_at: new Date().toISOString(),
      currency: "RUB",
    }));

    // Вставляем все транзакции
    const { error: insertError } = await supabase
      .from("transactions")
      .insert(transactions);

    if (insertError) {
      console.error("Error inserting transactions:", insertError);
      return NextResponse.json({ error: "Failed to save distribution" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in savings distribution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
