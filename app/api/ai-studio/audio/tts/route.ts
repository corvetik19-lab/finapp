import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST - Text-to-Speech (Gemini TTS)
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

    const client = getGeminiClient();
    const model = "gemini-2.0-flash";

    // Генерируем текстовое описание для озвучки
    // Примечание: TTS модели пока недоступны в global регионе
    // Используем текстовую модель для подготовки текста
    const response = await client.models.generateContent({
      model,
      contents: `Prepare this text for speech synthesis, keeping it natural and well-paced: "${text}"`,
    });

    // Извлекаем подготовленный текст
    let preparedText = text;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ("text" in part && part.text) {
          preparedText = part.text;
          break;
        }
      }
    }

    // Логируем использование
    await logAIStudioUsage(user.id, null, "audio", model, text.length, 0, {
      voice,
    });

    // Временно возвращаем сообщение что TTS недоступен
    // TTS модели пока недоступны в global регионе Vertex AI
    return NextResponse.json({
      error: "TTS временно недоступен. Используйте браузерный синтез речи.",
      preparedText,
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
