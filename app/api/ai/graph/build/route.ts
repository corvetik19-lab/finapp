import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { buildTransactionGraph } from "@/lib/ai/knowledge-graph";

/**
 * API для построения графа знаний
 * POST /api/ai/graph/build
 */
export async function POST() {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Строим граф
    const relationsCount = await buildTransactionGraph(user.id);

    return NextResponse.json({
      success: true,
      message: `Граф знаний построен успешно`,
      relations_created: relationsCount,
    });

  } catch (error) {
    console.error("Error building knowledge graph:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build graph" },
      { status: 500 }
    );
  }
}
