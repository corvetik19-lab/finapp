import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { analyzeSpendingPatterns } from "@/lib/ai/knowledge-graph";

/**
 * API для анализа паттернов трат
 * GET /api/ai/patterns
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Анализируем паттерны
    const result = await analyzeSpendingPatterns(user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error("Error analyzing patterns:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze patterns" },
      { status: 500 }
    );
  }
}
