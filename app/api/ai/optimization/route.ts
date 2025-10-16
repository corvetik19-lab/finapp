import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { generateOptimizationReport } from "@/lib/ai/optimization-advisor";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/optimization
 * 
 * Генерирует отчёт с рекомендациями по оптимизации расходов
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

    const report = await generateOptimizationReport(supabase, user.id);

    return NextResponse.json({
      report,
      has_opportunities: report.opportunities.length > 0,
      total_savings: report.total_potential_savings,
    });
  } catch (error) {
    console.error("Optimization analysis error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе оптимизации",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
