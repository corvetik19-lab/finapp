import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST - Генерация изображений
 * Генерация изображений недоступна через OpenRouter
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

    const { prompt, mode = "generate" } = await req.json();

    // Логируем попытку использования
    await logAIStudioUsage(user.id, null, "image", "unavailable", 0, 0, {
      prompt,
      mode,
    });

    // Генерация изображений недоступна через OpenRouter
    return NextResponse.json({
      error: "Генерация изображений временно недоступна. OpenRouter не поддерживает генерацию изображений.",
      status: "unavailable",
    }, { status: 503 });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации изображения" },
      { status: 500 }
    );
  }
}
