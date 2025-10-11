import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET - получить один промпт
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching prompt:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error("Prompt GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - обновить промпт
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Разрешённые поля для обновления
    const allowedFields = [
      "title",
      "description",
      "prompt_text",
      "category",
      "tags",
      "ai_model",
      "is_favorite",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Обновление счётчика использований
    if (body.increment_usage) {
      const { data: current } = await supabase
        .from("prompts")
        .select("usage_count")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (current) {
        updates.usage_count = (current.usage_count || 0) + 1;
        updates.last_used_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("prompts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("Error updating prompt:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error("Prompt PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - удалить промпт (настоящее удаление)
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting prompt:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Prompt DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
