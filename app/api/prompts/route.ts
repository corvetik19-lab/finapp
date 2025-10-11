import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GET - получить все промпты пользователя
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const aiModel = searchParams.get("ai_model");
    const favorite = searchParams.get("favorite");
    const search = searchParams.get("search");

    let query = supabase
      .from("prompts")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Фильтры
    if (category) {
      query = query.eq("category", category);
    }

    if (aiModel) {
      query = query.eq("ai_model", aiModel);
    }

    if (favorite === "true") {
      query = query.eq("is_favorite", true);
    }

    // Полнотекстовый поиск
    if (search) {
      query = query.textSearch("title", search, {
        type: "websearch",
        config: "russian",
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching prompts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompts: data || [] });
  } catch (error) {
    console.error("Prompts GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - создать новый промпт
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, prompt_text, category, tags, ai_model } = body;

    // Валидация
    if (!title || !prompt_text) {
      return NextResponse.json(
        { error: "Title and prompt_text are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("prompts")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        prompt_text,
        category: category || null,
        tags: tags || [],
        ai_model: ai_model || "Universal",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating prompt:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data }, { status: 201 });
  } catch (error) {
    console.error("Prompts POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
