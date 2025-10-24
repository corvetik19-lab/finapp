import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/categories - Получить категории
 */
export async function GET(request: Request) {
  return withApiAuth(
    request,
    async (apiKey, req) => {
      const { searchParams } = new URL(req.url);
      const { createClient } = await import("@supabase/supabase-js");
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const type = searchParams.get("type"); // income, expense

      let query = supabase
        .from("categories")
        .select("id, name, type, icon, color, parent_id, created_at")
        .eq("user_id", apiKey.user_id)
        .order("name", { ascending: true });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch categories", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    },
    { requiredScope: "read" }
  );
}

/**
 * POST /api/v1/categories - Создать категорию
 */
export async function POST(request: Request) {
  return withApiAuth(
    request,
    async (apiKey, req) => {
      const body = await req.json();
      const { name, type, icon, color, parent_id } = body;

      if (!name || !type) {
        return NextResponse.json(
          { error: "Missing required fields: name, type" },
          { status: 400 }
        );
      }

      if (!["income", "expense"].includes(type)) {
        return NextResponse.json(
          { error: "Type must be 'income' or 'expense'" },
          { status: 400 }
        );
      }

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: apiKey.user_id,
          name,
          type,
          icon,
          color,
          parent_id,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create category", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    },
    { requiredScope: "write" }
  );
}
