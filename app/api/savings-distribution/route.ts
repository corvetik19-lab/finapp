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
    const { distributions, periodStart, periodEnd } = body;

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return NextResponse.json({ error: "Invalid distributions" }, { status: 400 });
    }

    // Получаем текущий период (начало и конец месяца)
    const now = new Date();
    const period_start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const period_end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Удаляем старые распределения для этого периода
    await supabase
      .from("savings_distributions")
      .delete()
      .eq("user_id", user.id)
      .eq("period_start", period_start)
      .eq("period_end", period_end);

    // Создаем записи распределения для каждой карты
    const savingsDistributions = distributions.map((dist: { accountId: string; amount: number }) => ({
      user_id: user.id,
      account_id: dist.accountId,
      amount: dist.amount, // уже в копейках
      currency: "RUB",
      period_start,
      period_end,
      note: "Плановое распределение экономии",
    }));

    // Вставляем распределения
    const { error: insertError } = await supabase
      .from("savings_distributions")
      .insert(savingsDistributions);

    if (insertError) {
      console.error("Error inserting distributions:", insertError);
      return NextResponse.json({ error: "Failed to save distribution" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in savings distribution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
