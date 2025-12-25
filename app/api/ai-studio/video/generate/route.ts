import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST - Генерация видео
 * Видеогенерация недоступна через OpenRouter
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

    const { prompt, mode = "text", duration = 8 } = await req.json();

    // Логируем попытку использования
    await logAIStudioUsage(user.id, null, "video", "unavailable", 0, 0, {
      prompt,
      mode,
      duration,
    });

    // Видеогенерация недоступна через OpenRouter
    return NextResponse.json({
      error: "Видеогенерация временно недоступна. OpenRouter не поддерживает генерацию видео.",
      status: "unavailable",
    }, { status: 503 });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации видео" },
      { status: 500 }
    );
  }
}
