import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { theme } = body;

    // Валидация
    if (!theme || !["light", "dark", "auto"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme value" },
        { status: 400 }
      );
    }

    // Сохраняем тему в user_preferences
    const { error: upsertError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          theme,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Error saving theme:", upsertError);
      return NextResponse.json(
        { error: "Failed to save theme" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error("Theme API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Загружаем тему из базы
    const { data, error } = await supabase
      .from("user_preferences")
      .select("theme")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // Если записи нет, возвращаем дефолтную тему
      return NextResponse.json({ theme: "auto" });
    }

    return NextResponse.json({ theme: data?.theme || "auto" });
  } catch (error) {
    console.error("Theme GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
