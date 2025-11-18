import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

// GET /api/plans - получить все планы пользователя
export async function GET() {
  try {
    const supabase = await createRouteClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: plans, error } = await supabase
      .from("plans")
      .select(
        `
        *,
        plan_type:plan_types(id, name, icon, color),
        account:accounts(id, name),
        category:categories(id, name)
      `,
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/plans - создать новый план
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
      name,
      description,
      plan_type_id,
      goal_amount,
      monthly_contribution,
      target_date,
      priority,
      account_id,
      category_id,
      tags,
      note,
      links,
      currency,
    } = body;

    if (!name || !goal_amount) {
      return NextResponse.json({ error: "Name and goal_amount are required" }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from("plans")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        plan_type_id: plan_type_id || null,
        goal_amount: Math.round(Number(goal_amount) * 100), // конвертируем в копейки
        current_amount: 0,
        monthly_contribution: monthly_contribution ? Math.round(Number(monthly_contribution) * 100) : 0,
        target_date: target_date || null,
        priority: priority || "Средний",
        account_id: account_id || null,
        category_id: category_id || null,
        tags: tags || [],
        note: note || null,
        links: links || [],
        currency: currency || "RUB",
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/finance/plans");
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
