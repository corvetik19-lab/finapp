import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST - Text-to-Speech
 * TTS недоступен через OpenRouter - используйте браузерный синтез речи
 */
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const hasAccess = await hasAIStudioAccess(user.id, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { text, voice = "Kore" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // Логируем использование
    await logAIStudioUsage(user.id, null, "audio", "tts", text.length, 0, {
      voice,
    });

    // TTS недоступен через OpenRouter
    return NextResponse.json({
      error: "TTS недоступен. Используйте браузерный синтез речи (Web Speech API).",
      preparedText: text,
      status: "unavailable",
    }, { status: 503 });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации аудио" },
      { status: 500 }
    );
  }
}
