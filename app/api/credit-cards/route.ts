import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET() {
  const supabase = await createRouteClient();

  const { data: cards, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("type", "card")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load credit cards:", error);
    return NextResponse.json({ error: "Failed to load credit cards" }, { status: 500 });
  }

  return NextResponse.json({ cards });
}

export async function POST(request: NextRequest) {
  const supabase = await createRouteClient();

  try {
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      credit_limit,
      balance,
      interest_rate,
      grace_period,
      next_payment_date,
      min_payment,
      currency = "RUB",
    } = body;

    // Валидация
    if (!name || !credit_limit) {
      return NextResponse.json(
        { error: "Name and credit limit are required" },
        { status: 400 }
      );
    }

    const { data: card, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        type: "card",
        balance: balance || 0,
        currency,
        credit_limit,
        interest_rate: interest_rate || null,
        grace_period: grace_period || null,
        next_payment_date: next_payment_date || null,
        min_payment: min_payment || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create credit card:", error);
      return NextResponse.json(
        { error: "Failed to create credit card", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
