import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST - сгенерировать одноразовый код для привязки Telegram
 */
export async function POST() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Генерируем 6-значный код
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Срок действия - 10 минут
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Сохраняем код в таблице telegram_link_codes
    const { error } = await supabase
      .from("telegram_link_codes")
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt,
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      code,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Generate link code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
