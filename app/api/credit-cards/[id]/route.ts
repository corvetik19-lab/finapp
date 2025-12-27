import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createRouteClient();
  const { id } = await context.params;

  try {
    const body = await request.json();
    const {
      name,
      balance,
      credit_limit,
      interest_rate,
      grace_period,
      grace_period_active,
      grace_period_start_date,
      next_payment_date,
      min_payment_percent,
      min_payment_amount,
      card_number_last4,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (balance !== undefined) updateData.balance = balance;
    if (credit_limit !== undefined) updateData.credit_limit = credit_limit;
    if (interest_rate !== undefined) updateData.interest_rate = interest_rate;
    if (grace_period !== undefined) updateData.grace_period = grace_period;
    if (grace_period_active !== undefined) updateData.grace_period_active = grace_period_active;
    if (grace_period_start_date !== undefined) updateData.grace_period_start_date = grace_period_start_date;
    if (next_payment_date !== undefined) updateData.next_payment_date = next_payment_date;
    if (min_payment_percent !== undefined) updateData.min_payment_percent = min_payment_percent;
    if (min_payment_amount !== undefined) updateData.min_payment_amount = min_payment_amount;
    if (card_number_last4 !== undefined) updateData.card_number_last4 = card_number_last4;

    const { data: card, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .eq("type", "card")
      .select()
      .single();

    if (error) {
      console.error("Failed to update credit card:", error);
      return NextResponse.json(
        { error: "Failed to update credit card" },
        { status: 500 }
      );
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createRouteClient();
  const { id } = await context.params;

  try {
    // Проверяем авторизацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем, что карта принадлежит пользователю
    const { data: card, error: cardError } = await supabase
      .from("accounts")
      .select("id, user_id")
      .eq("id", id)
      .eq("type", "card")
      .eq("user_id", user.id)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    // Удаляем все транзакции, связанные с этой картой
    const { error: txnError } = await supabase
      .from("transactions")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    if (txnError) {
      console.error("Failed to delete transactions:", txnError);
      return NextResponse.json(
        { error: "Failed to delete transactions" },
        { status: 500 }
      );
    }

    // Мягкое удаление карты
    const { error: deleteError } = await supabase
      .from("accounts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("type", "card")
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete credit card:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete credit card" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
