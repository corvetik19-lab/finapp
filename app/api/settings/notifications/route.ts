import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - Получить настройки уведомлений пользователя
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // Если настроек нет, создаём дефолтные
      if (error.code === "PGRST116") {
        const { data: newSettings, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            overspend_alerts: true,
            budget_warnings: true,
            missing_transaction_reminders: false,
            upcoming_payment_reminders: true,
            ai_insights: true,
            ai_recommendations: true,
            email_notifications: false,
            push_notifications: true,
            notification_frequency: "daily",
            schedule_enabled: true,
            schedule_time: "09:00:00",
            schedule_days: [1, 2, 3, 4, 5, 6, 7],
            telegram_enabled: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return NextResponse.json(newSettings);
      }
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Обновить настройки уведомлений
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createRouteClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Валидация данных
    const allowedFields = [
      "overspend_alerts",
      "budget_warnings",
      "missing_transaction_reminders",
      "upcoming_payment_reminders",
      "ai_insights",
      "ai_recommendations",
      "email_notifications",
      "push_notifications",
      "notification_frequency",
      "quiet_hours_start",
      "quiet_hours_end",
      "schedule_enabled",
      "schedule_time",
      "schedule_days",
      "telegram_enabled",
    ];

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    // Обновляем или создаём настройки
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/settings/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
