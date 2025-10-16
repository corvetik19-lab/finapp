import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { compareMonthToMonth, compareYearToYear } from "@/lib/analytics/comparison";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/comparison?type=month|year&date=2025-01
 * 
 * Возвращает сравнение между периодами
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
    const type = searchParams.get("type") || "month";
    const dateParam = searchParams.get("date");

    let comparison;

    if (type === "month") {
      const targetDate = dateParam ? new Date(dateParam) : undefined;
      comparison = await compareMonthToMonth(supabase, user.id, targetDate);
    } else if (type === "year") {
      const targetYear = dateParam ? parseInt(dateParam) : undefined;
      comparison = await compareYearToYear(supabase, user.id, targetYear);
    } else {
      return NextResponse.json({ error: "Invalid comparison type" }, { status: 400 });
    }

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при сравнении периодов",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
