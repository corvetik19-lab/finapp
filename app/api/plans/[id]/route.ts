import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Context type for Next.js 15 dynamic route params
type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/plans/[id] - обновить план
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createRouteClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
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
      status,
    } = body;

    if (!name || goal_amount === undefined) {
      return NextResponse.json({ error: "Name and goal_amount are required" }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from("plans")
      .update({
        name,
        description: description || null,
        plan_type_id: plan_type_id || null,
        goal_amount: Math.round(Number(goal_amount) * 100),
        monthly_contribution: monthly_contribution ? Math.round(Number(monthly_contribution) * 100) : 0,
        target_date: target_date || null,
        priority: priority || "Средний",
        account_id: account_id || null,
        category_id: category_id || null,
        tags: tags || [],
        note: note || null,
        links: links || [],
        currency: currency || "RUB",
        status: status || "active",
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    revalidatePath("/finance/plans");
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/plans/[id] - удалить план (мягкое удаление)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createRouteClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Мягкое удаление через deleted_at
    const { error } = await supabase
      .from("plans")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting plan:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/finance/plans");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
