import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST - Анализ документов
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const query = formData.get("query") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    // Читаем файл
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const client = getGeminiClient();
    const model = "gemini-2.5-flash";

    // Формируем промпт
    const systemPrompt = query
      ? `Проанализируй документ и ответь на вопрос: ${query}`
      : `Проанализируй документ и предоставь:
1. Краткое содержание (summary)
2. Ключевые моменты (keyPoints) - массив строк

Ответ в формате JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."]
}`;

    // Анализируем документ
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: systemPrompt },
          ],
        },
      ],
    });

    const text = response.text || "";

    // Пробуем распарсить JSON
    let result = {
      summary: text,
      keyPoints: [] as string[],
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          summary: parsed.summary || text,
          keyPoints: parsed.keyPoints || [],
        };
      }
    } catch {
      // Если не JSON, используем текст как summary
    }

    // Логируем использование
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    await logAIStudioUsage(user.id, null, "document", model, inputTokens, outputTokens, {
      fileName: file.name,
      fileSize: file.size,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { error: "Ошибка анализа документа" },
      { status: 500 }
    );
  }
}
