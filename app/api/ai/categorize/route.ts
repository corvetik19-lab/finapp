/**
 * API для автокатегоризации транзакций
 * POST /api/ai/categorize
 */

import { NextRequest, NextResponse } from "next/server";
import { suggestCategory } from "@/lib/ai/embeddings";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, direction = "expense" } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Получаем список доступных категорий пользователя
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Загружаем категории нужного типа
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, type")
      .eq("user_id", user.id)
      .eq("type", direction)
      .order("name");

    if (error) {
      throw new Error("Failed to fetch categories");
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        {
          error: "No categories available",
          suggestion: "Create some categories first",
        },
        { status: 400 }
      );
    }

    // Получаем предложение от AI
    const suggestion = await suggestCategory(description, categories);

    return NextResponse.json({
      description,
      suggestion: {
        categoryId: suggestion.categoryId,
        categoryName: suggestion.categoryName,
        confidence: Math.round(suggestion.confidence * 100), // В процентах
        explanation: suggestion.explanation,
      },
    });
  } catch (error) {
    console.error("Categorization error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to suggest category",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
