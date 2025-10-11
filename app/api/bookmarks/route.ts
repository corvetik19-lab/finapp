import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GET - получить все закладки пользователя
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const favorite = searchParams.get("favorite");
    const search = searchParams.get("search");

    let query = supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Фильтры
    if (category) {
      query = query.eq("category", category);
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
      console.error("Error fetching bookmarks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: data || [] });
  } catch (error) {
    console.error("Bookmarks GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - создать новую закладку
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, url, description, category, tags, favicon_url } = body;

    // Валидация
    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        title,
        url,
        description: description || null,
        category: category || null,
        tags: tags || [],
        favicon_url: favicon_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating bookmark:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmark: data }, { status: 201 });
  } catch (error) {
    console.error("Bookmarks POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
