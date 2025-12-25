import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getOpenRouterClient, OPENROUTER_CHAT_MODEL } from "@/lib/ai/openrouter-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model: string;
  config: {
    thinkingLevel: "low" | "medium" | "high";
    enableSearch: boolean;
    enableUrlContext: boolean;
    enableCodeExecution: boolean;
  };
  imageConfig?: {
    aspectRatio?: string;
    numberOfImages?: number;
    negativePrompt?: string;
    seed?: number;
    guidanceScale?: number;
    enhancePrompt?: boolean;
  };
}

/**
 * POST - Чат с Gemini (AI Studio)
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

    // Проверяем доступ к AI Studio
    const hasAccess = await hasAIStudioAccess(user.id, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { messages, model, config }: ChatRequest = await req.json();

    // Используем OpenRouter клиент
    const client = getOpenRouterClient();

    // Формируем сообщения для OpenRouter (OpenAI-совместимый формат)
    const openRouterMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Добавляем системный промпт если нужен поиск
    if (config.enableSearch) {
      openRouterMessages.unshift({
        role: "user" as const,
        content: "[System: You have access to web search. When answering questions, search for current information when needed.]",
      });
    }

    // Используем модель из запроса или дефолтную
    // Маппинг старых моделей на OpenRouter
    let actualModel = model;
    if (model.includes("gemini-2.0") || model.includes("gemini-2.5")) {
      actualModel = OPENROUTER_CHAT_MODEL; // google/gemini-3-flash-preview
    } else if (model.includes("gemini-3")) {
      actualModel = "google/gemini-3-flash-preview";
    }
    
    console.log(`[AI Studio Chat] Model: ${actualModel}`);
    
    const response = await client.chat(openRouterMessages, {
      temperature: 0.7,
      max_tokens: 8192,
    });

    // Извлекаем данные из ответа OpenRouter
    const content = response.choices[0]?.message?.content || "";
    const thinking = ""; // OpenRouter не возвращает thinking отдельно
    const sources: Array<{ title: string; url: string }> = [];
    const codeResults: Array<{ code: string; output: string; language: string }> = [];

    // Логируем использование
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    await logAIStudioUsage(
      user.id,
      null,
      "chat",
      model,
      inputTokens,
      outputTokens,
      { thinkingLevel: config.thinkingLevel }
    );

    return NextResponse.json({
      content: content.trim(),
      thinking: thinking.trim() || undefined,
      sources: sources.length > 0 ? sources : undefined,
      codeResults: codeResults.length > 0 ? codeResults : undefined,
      usage: {
        inputTokens,
        outputTokens,
      },
    });
  } catch (error) {
    // Детальное логирование ошибки
    console.error("AI Studio chat error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Определяем тип ошибки и формируем понятное сообщение
    let errorMessage = "Произошла ошибка при обработке запроса";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("NOT_FOUND") || error.message.includes("404")) {
        errorMessage = "Модель не найдена. Попробуйте выбрать другую модель.";
        statusCode = 404;
      } else if (error.message.includes("PERMISSION_DENIED") || error.message.includes("403")) {
        errorMessage = "Нет доступа к API. Проверьте настройки проекта.";
        statusCode = 403;
      } else if (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("429")) {
        errorMessage = "Превышен лимит запросов. Подождите немного и попробуйте снова.";
        statusCode = 429;
      } else if (error.message.includes("INVALID_ARGUMENT")) {
        errorMessage = "Некорректный запрос. Проверьте входные данные.";
        statusCode = 400;
      } else if (error.message.includes("timeout") || error.message.includes("DEADLINE_EXCEEDED")) {
        errorMessage = "Превышено время ожидания. Попробуйте ещё раз.";
        statusCode = 504;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
