import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { smartCategorizeTransaction } from "@/lib/ai/smart-categorization";

export const runtime = "edge";
export const maxDuration = 30;

/**
 * POST /api/ai/smart-categorize
 * Умная автокатегоризация транзакции с использованием embeddings
 * 
 * Body:
 * {
 *   "description": "Покупка кофе в Starbucks",
 *   "threshold": 0.75 (optional)
 * }
 */
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
    const { description, threshold = 0.75 } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Получаем доступные категории пользователя
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, kind")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (categoriesError || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: "No categories found. Please create categories first." },
        { status: 400 }
      );
    }

    // Форматируем категории
    const formattedCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.kind || "expense",
    }));

    // Выполняем умную категоризацию
    const result = await smartCategorizeTransaction(
      description,
      user.id,
      formattedCategories,
      threshold
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Smart categorization error:", error);
    return NextResponse.json(
      {
        error: "Failed to categorize transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
