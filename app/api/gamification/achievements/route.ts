import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/gamification/achievements
 * Получает все достижения с прогрессом для текущего пользователя
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем все определения достижений
    const { data: definitions, error: defError } = await supabase
      .from("achievements")
      .select("*")
      .order("category", { ascending: true })
      .order("points", { ascending: true });

    if (defError) {
      console.error("Failed to load achievement definitions:", defError);
      return NextResponse.json({ error: "Failed to load achievements" }, { status: 500 });
    }

    // Получаем разблокированные достижения пользователя
    const { data: userAchievements, error: userError } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id);

    if (userError) {
      console.error("Failed to load user achievements:", userError);
      return NextResponse.json({ error: "Failed to load user achievements" }, { status: 500 });
    }

    // Создаём Map для быстрого поиска
    const userAchievementsMap = new Map();
    userAchievements?.forEach((ua) => {
      userAchievementsMap.set(ua.achievement_id, ua);
    });

    // Комбинируем данные
    const achievements = (definitions || []).map((def) => {
      const userAchievement = userAchievementsMap.get(def.id);
      const unlocked = !!userAchievement;
      const progress = userAchievement?.progress || 0;
      const maxProgress = def.requirement_value || 1;
      const percentage = maxProgress > 0 ? (progress / maxProgress) * 100 : unlocked ? 100 : 0;

      return {
        ...def,
        unlocked,
        unlocked_at: userAchievement?.unlocked_at,
        progress,
        maxProgress,
        percentage: Math.min(100, percentage),
      };
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Achievements GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
