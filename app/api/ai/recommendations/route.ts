import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getGraphBasedRecommendations } from "@/lib/ai/knowledge-graph";

/**
 * API для получения рекомендаций на основе графа знаний
 * GET /api/ai/recommendations
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем рекомендации
    const result = await getGraphBasedRecommendations(user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error("Error getting recommendations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
