import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Дефолтная конфигурация виджетов
const DEFAULT_WIDGETS = [
  { id: "budget", enabled: true, order: 0 },
  { id: "financial-trends", enabled: true, order: 1 },
  { id: "expense-by-category", enabled: true, order: 2 },
  { id: "net-worth", enabled: true, order: 3 },
  { id: "plans", enabled: true, order: 4 },
  { id: "upcoming-payments", enabled: true, order: 5 },
  { id: "recent-notes", enabled: true, order: 6 },
  { id: "category-management", enabled: true, order: 7 },
];

/**
 * GET - Получить настройки дашборда
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
    const { data: settings, error } = await supabase
      .from("user_dashboard_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Если настроек нет, возвращаем дефолтные значения
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        widget_layout: DEFAULT_WIDGETS,
        theme: "light",
      });
    }

    if (error) {
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get dashboard settings error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard settings" },
      { status: 500 }
    );
  }
}

/**
 * POST - Сохранить настройки дашборда
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
    const { widget_layout, theme } = body;

    // Валидация
    if (widget_layout && !Array.isArray(widget_layout)) {
      return NextResponse.json(
        { error: "widget_layout must be an array" },
        { status: 400 }
      );
    }

    if (theme && !["light", "dark", "auto"].includes(theme)) {
      return NextResponse.json(
        { error: "theme must be light, dark, or auto" },
        { status: 400 }
      );
    }

    // Upsert настроек
    const { data, error } = await supabase
      .from("user_dashboard_settings")
      .upsert(
        {
          user_id: user.id,
          widget_layout: widget_layout || DEFAULT_WIDGETS,
          theme: theme || "light",
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
      settings: data,
      message: "Dashboard settings saved successfully",
    });
  } catch (error) {
    console.error("Save dashboard settings error:", error);
    return NextResponse.json(
      { error: "Failed to save dashboard settings" },
      { status: 500 }
    );
  }
}
