import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { analyzeTrends } from "@/lib/analytics/trends";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/trends?months=6
 * 
 * Возвращает анализ трендов и среднего чека
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
    const monthsBack = parseInt(searchParams.get("months") || "6");

    const report = await analyzeTrends(supabase, user.id, monthsBack);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Trends analysis error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при анализе трендов",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
