import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getOpenRouterClient, OPENROUTER_CHAT_MODEL } from "@/lib/ai/openrouter-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * POST - Deep Research Agent (OpenRouter)
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

    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic required" }, { status: 400 });
    }

    const client = getOpenRouterClient();

    // Deep Research prompt
    const researchPrompt = `Проведи глубокое исследование на тему: "${topic}"

Предоставь результат в формате JSON:
{
  "topic": "тема исследования",
  "summary": "краткое резюме (2-3 абзаца)",
  "sections": [
    {
      "title": "заголовок секции",
      "content": "содержание секции"
    }
  ],
  "sources": [
    {
      "title": "название источника",
      "url": "ссылка (если известна)"
    }
  ]
}

Включи 3-5 секций с детальной информацией.`;

    // Выполняем исследование через OpenRouter
    const response = await client.chat([
      { role: "user", content: researchPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 8192,
    });

    const text = response.choices[0]?.message?.content || "";

    // Парсим результат
    let result = {
      topic,
      summary: "",
      sections: [] as Array<{ title: string; content: string }>,
      sources: [] as Array<{ title: string; url: string }>,
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          topic: parsed.topic || topic,
          summary: parsed.summary || "",
          sections: parsed.sections || [],
          sources: parsed.sources || [],
        };
      } else {
        result.summary = text;
      }
    } catch {
      result.summary = text;
    }

    // Логируем использование
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    await logAIStudioUsage(user.id, null, "research", OPENROUTER_CHAT_MODEL, inputTokens, outputTokens, {
      topic,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: "Ошибка исследования" },
      { status: 500 }
    );
  }
}
