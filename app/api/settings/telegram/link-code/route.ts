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

    // Проверяем, есть ли уже активный код
    const { data: existingCode } = await supabase
      .from("telegram_link_codes")
      .select("code, expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Если активный код уже есть, возвращаем его
    if (existingCode) {
      return NextResponse.json({
        success: true,
        code: existingCode.code,
        expires_at: existingCode.expires_at,
        reused: true,
      });
    }

    // Генерируем новый 6-значный код
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
      reused: false,
    });
  } catch (error) {
    console.error("Generate link code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
