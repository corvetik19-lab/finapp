import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

// POST /api/plan-topups - добавить взнос в план
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      plan_id,
      amount,
      type,
      description,
      date,
      transaction_id,
      create_transaction,
      account_id,
      category_id,
    } = body;

    if (!plan_id || !amount) {
      return NextResponse.json({ error: "plan_id and amount are required" }, { status: 400 });
    }

    // Проверяем, что план принадлежит пользователю
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, name, currency")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError) {
      console.error("Error fetching plan:", planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    if (!plan) {
      console.error("Plan not found for id:", plan_id, "user:", user.id);
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    let finalTransactionId = transaction_id || null;

    // Создаем транзакцию, если требуется
    if (create_transaction && account_id) {
      const direction = type === "topup" ? "expense" : "income";
      const amountMinor = Math.round(Number(amount) * 100);

      const { data: transaction, error: txnError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id,
          category_id: category_id || null,
          amount: amountMinor,
          currency: plan.currency || "RUB",
          direction,
          counterparty: plan.name,
          note: description || `Взнос в план: ${plan.name}`,
          occurred_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (txnError) {
        console.error("Error creating transaction:", txnError);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
      }

      finalTransactionId = transaction.id;
    }

    // Создаем взнос
    const { data: topup, error } = await supabase
      .from("plan_topups")
      .insert({
        plan_id,
        user_id: user.id,
        amount: Math.round(Number(amount) * 100), // в копейках
        type: type || "topup",
        description: description || null,
        occurred_at: date || new Date().toISOString().split("T")[0],
        transaction_id: finalTransactionId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating topup:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/finance/plans");
    return NextResponse.json({ topup }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/plan-topups?plan_id=xxx - получить историю взносов плана
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("plan_id");

    if (!planId) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    const { data: topups, error } = await supabase
      .from("plan_topups")
      .select("*")
      .eq("plan_id", planId)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false });

    if (error) {
      console.error("Error fetching topups:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topups: topups || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
