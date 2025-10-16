import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import {
  calculateGoalForecast,
  getAllGoalForecasts,
} from "@/lib/ai/goal-forecast";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/goal-forecast
 * 
 * Получает прогнозы достижения финансовых целей
 * 
 * Query параметры:
 * - plan_id (optional): ID конкретного плана для прогноза
 * 
 * Если plan_id не указан, возвращает прогнозы для всех планов пользователя
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
    const planId = searchParams.get("plan_id");

    // Если запрашивается конкретный план
    if (planId) {
      const forecast = await calculateGoalForecast(supabase, user.id, planId);

      if (!forecast) {
        return NextResponse.json(
          { error: "План не найден" },
          { status: 404 }
        );
      }

      return NextResponse.json({ forecast });
    }

    // Иначе возвращаем все планы
    const forecasts = await getAllGoalForecasts(supabase, user.id);

    if (forecasts.length === 0) {
      return NextResponse.json({
        forecasts: [],
        message: "У вас пока нет финансовых планов",
      });
    }

    return NextResponse.json({ forecasts });
  } catch (error) {
    console.error("Goal forecast error:", error);
    return NextResponse.json(
      {
        error: "Ошибка при расчёте прогноза",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
