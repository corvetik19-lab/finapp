import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/gamification/level
 * Получает уровень и XP текущего пользователя
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем или создаём запись уровня
    const { data: levelData, error } = await supabase
      .from("user_levels")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let level = levelData;

    if (error && error.code === "PGRST116") {
      // Запись не найдена - создаём
      const { data: newLevel, error: createError } = await supabase
        .from("user_levels")
        .insert({
          user_id: user.id,
          level: 1,
          xp: 0,
          xp_to_next_level: 100,
          total_xp: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create user level:", createError);
        return NextResponse.json({ error: "Failed to create level" }, { status: 500 });
      }

      level = newLevel;
    } else if (error) {
      console.error("Failed to load user level:", error);
      return NextResponse.json({ error: "Failed to load level" }, { status: 500 });
    }

    // Вычисляем прогресс до следующего уровня
    const current = level!.xp;
    const next = level!.xp_to_next_level;
    const percentage = next > 0 ? (current / next) * 100 : 0;

    const progress = {
      current,
      next,
      percentage: Math.min(100, percentage),
    };

    return NextResponse.json({
      level,
      progress,
    });
  } catch (error) {
    console.error("Level GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
