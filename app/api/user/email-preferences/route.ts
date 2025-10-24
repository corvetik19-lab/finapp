import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - Получить настройки email уведомлений
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

    // Получаем настройки пользователя
    const { data: preferences, error } = await supabase
      .from("user_email_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Если настроек нет, возвращаем дефолтные значения
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        budget_alerts_enabled: true,
        transaction_alerts_enabled: true,
        weekly_summary_enabled: false,
        weekly_summary_day: 1,
        weekly_summary_time: "09:00:00",
        custom_email: null,
      });
    }

    if (error) {
      throw error;
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Get email preferences error:", error);
    return NextResponse.json(
      { error: "Failed to get email preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST/PUT - Сохранить настройки email уведомлений
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      budget_alerts_enabled,
      transaction_alerts_enabled,
      weekly_summary_enabled,
      weekly_summary_day,
      weekly_summary_time,
      custom_email,
    } = body;

    // Проверяем валидность данных
    if (weekly_summary_day && (weekly_summary_day < 1 || weekly_summary_day > 7)) {
      return NextResponse.json(
        { error: "weekly_summary_day must be between 1 and 7" },
        { status: 400 }
      );
    }

    // Пытаемся вставить или обновить (upsert)
    const { data, error } = await supabase
      .from("user_email_preferences")
      .upsert(
        {
          user_id: user.id,
          budget_alerts_enabled: budget_alerts_enabled ?? true,
          transaction_alerts_enabled: transaction_alerts_enabled ?? true,
          weekly_summary_enabled: weekly_summary_enabled ?? false,
          weekly_summary_day: weekly_summary_day ?? 1,
          weekly_summary_time: weekly_summary_time ?? "09:00:00",
          custom_email: custom_email || null,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: data,
      message: "Email preferences saved successfully",
    });
  } catch (error) {
    console.error("Save email preferences error:", error);
    return NextResponse.json(
      { error: "Failed to save email preferences" },
      { status: 500 }
    );
  }
}
