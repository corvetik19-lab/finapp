import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { analyzeSeasonality } from "@/lib/analytics/seasonality";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/seasonality?months=12
 * 
 * Возвращает анализ сезонности трат
 */
export async function GET(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get("months") || "12");

    const report = await analyzeSeasonality(supabase, user.id, monthsBack);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Seasonality analysis error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе сезонности",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
