import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/gamification/streaks
 * Получает стрик текущего пользователя
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем стрик пользователя
    const { data: streak, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to load streak:", error);
      return NextResponse.json({ error: "Failed to load streak" }, { status: 500 });
    }

    // Если стрика нет, возвращаем пустой объект
    const streakData = streak || {
      current_streak: 0,
      longest_streak: 0,
      total_active_days: 0,
      last_activity_date: null,
    };

    return NextResponse.json({ streak: streakData });
  } catch (error) {
    console.error("Streaks GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
