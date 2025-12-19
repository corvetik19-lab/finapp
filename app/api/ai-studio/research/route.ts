import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * POST - Deep Research Agent
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

    const client = getGeminiClient();
    const model = "gemini-2.5-flash";

    // Deep Research prompt
    const researchPrompt = `Проведи глубокое исследование на тему: "${topic}"

Используй поиск Google для получения актуальной информации.

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
      "url": "ссылка"
    }
  ]
}

Включи 3-5 секций и укажи реальные источники информации.`;

    // Выполняем исследование с Google Search
    const response = await client.models.generateContent({
      model,
      contents: researchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: {
          thinkingBudget: 16384,
          includeThoughts: true,
        },
      },
    });

    const text = response.text || "";

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
        // Если не JSON, используем текст как summary
        result.summary = text;
      }
    } catch {
      result.summary = text;
    }

    // Извлекаем источники из grounding metadata
    if (response.candidates && response.candidates[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web && !result.sources.find(s => s.url === chunk.web?.uri)) {
          result.sources.push({
            title: chunk.web.title || "Source",
            url: chunk.web.uri || "",
          });
        }
      }
    }

    // Логируем использование
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    await logAIStudioUsage(user.id, null, "research", model, inputTokens, outputTokens, {
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
