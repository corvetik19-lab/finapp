import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - получить текущие настройки Telegram
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

    const { data } = await supabase
      .from("notification_preferences")
      .select("telegram_user_id, telegram_username, telegram_linked_at, telegram_chat_id")
      .eq("user_id", user.id)
      .single();

    // Проверяем, есть ли активный код привязки
    const { data: activeCode } = await supabase
      .from("telegram_link_codes")
      .select("code, expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      ...(data || {
        telegram_user_id: null,
        telegram_username: null,
        telegram_linked_at: null,
        telegram_chat_id: null,
      }),
      active_code: activeCode?.code || null,
      code_expires_at: activeCode?.expires_at || null,
    });
  } catch (error) {
    console.error("Get Telegram settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - отвязать Telegram аккаунт
 */
export async function DELETE() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("notification_preferences")
      .update({
        telegram_user_id: null,
        telegram_username: null,
        telegram_chat_id: null,
        telegram_linked_at: null,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Telegram unlinked successfully",
    });
  } catch (error) {
    console.error("Unlink Telegram error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
