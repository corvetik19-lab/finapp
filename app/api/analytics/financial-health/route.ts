import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { analyzeFinancialHealth } from "@/lib/analytics/financial-health";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/financial-health
 * 
 * Возвращает оценку финансового здоровья
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await analyzeFinancialHealth(supabase, user.id);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Financial health analysis error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе финансового здоровья",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
