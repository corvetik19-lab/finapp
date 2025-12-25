import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { OPENROUTER_CHAT_MODEL } from "@/lib/ai/openrouter-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST - Анализ документов через OpenRouter Vision
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

    const apiKey = process.env.OPENROUTER_FINANCE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API not configured" }, { status: 500 });
    }

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

    // Анализируем документ через OpenRouter Vision API
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://finapp.vercel.app",
        "X-Title": "FinApp AI Studio",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview", // Vision model - Gemini 3 мультимодальная
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter error:", error);
      return NextResponse.json({ error: "Ошибка анализа документа" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

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
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    await logAIStudioUsage(user.id, null, "document", OPENROUTER_CHAT_MODEL, inputTokens, outputTokens, {
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
