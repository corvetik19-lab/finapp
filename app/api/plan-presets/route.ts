import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

// GET /api/plan-presets - получить все пресеты планов пользователя
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

    const { data: planPresets, error } = await supabase
      .from("plan_presets")
      .select(
        `
        *,
        plan_type:plan_types(id, name, icon, color)
      `,
      )
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching plan presets:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ planPresets: planPresets || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/plan-presets - создать новый пресет
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
    const { name, plan_type_id, goal_amount, monthly_contribution, priority, note, icon, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: planPreset, error } = await supabase
      .from("plan_presets")
      .insert({
        user_id: user.id,
        name,
        plan_type_id: plan_type_id || null,
        goal_amount: goal_amount ? Math.round(Number(goal_amount) * 100) : null,
        monthly_contribution: monthly_contribution ? Math.round(Number(monthly_contribution) * 100) : null,
        priority: priority || "Средний",
        note: note || null,
        icon: icon || "flag",
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating plan preset:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ planPreset }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/plan-presets?id=xxx - удалить пресет
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("plan_presets").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting plan preset:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
