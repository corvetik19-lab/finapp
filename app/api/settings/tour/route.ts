import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

const DEFAULT_TOUR_STATUS = {
  dashboard: false,
  transactions: false,
  reports: false,
  plans: false,
  settings: false,
  loans: false,
  cards: false,
} as const;

export async function GET() {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем настройки тура из user_preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from("user_preferences")
      .select("tour_enabled, tour_completed")
      .eq("user_id", user.id)
      .single();

    // Если записи нет - создаём её с дефолтными значениями
    if (preferencesError && preferencesError.code === 'PGRST116') {
      const { data: newPrefs, error: insertError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          tour_enabled: true,
          tour_completed: { ...DEFAULT_TOUR_STATUS },
        })
        .select("tour_enabled, tour_completed")
        .single();
      
      if (insertError) {
        console.error("Error creating tour settings:", insertError);
        return NextResponse.json({
          enabled: true,
          completedTours: { ...DEFAULT_TOUR_STATUS },
        });
      }
      
      return NextResponse.json({
        enabled: newPrefs.tour_enabled,
        completedTours: newPrefs.tour_completed,
      });
    }

    if (preferencesError) {
      console.error("Error fetching tour settings:", preferencesError);
      return NextResponse.json({
        enabled: true,
        completedTours: { ...DEFAULT_TOUR_STATUS },
      });
    }

    return NextResponse.json({
      enabled: preferences?.tour_enabled ?? true,
      completedTours: preferences?.tour_completed ?? { ...DEFAULT_TOUR_STATUS },
    });
  } catch (error) {
    console.error("Error in GET /api/settings/tour:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, completedTours } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid tour settings" },
        { status: 400 }
      );
    }

    // Сохраняем настройки тура в user_preferences (upsert создаст запись если её нет)
    const { error: upsertError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        tour_enabled: enabled,
        tour_completed: completedTours ?? { ...DEFAULT_TOUR_STATUS },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error("Error updating tour settings:", upsertError);
      return NextResponse.json(
        { error: "Failed to update tour settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/settings/tour:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
