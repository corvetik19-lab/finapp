import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

// GET /api/categories - список категорий пользователя (с возможной фильтрацией по типу)
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
    const kind = searchParams.get("kind");

    let query = supabase
      .from("categories")
      .select("id, name, kind")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (kind) {
      query = query.eq("kind", kind);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
