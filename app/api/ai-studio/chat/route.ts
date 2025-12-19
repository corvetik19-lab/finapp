import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient, getImageClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";
import { Modality } from "@google/genai";

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

    // Проверяем, является ли это модель генерации изображений
    const isImageModel = model.includes("image") || model.includes("imagen");
    
    // Используем соответствующий клиент (image клиент использует location=global)
    const client = isImageModel ? getImageClient() : getGeminiClient();

    // Формируем contents
    const contents = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Формируем tools на основе конфигурации
    const tools: Array<Record<string, unknown>> = [];
    
    if (config.enableSearch) {
      tools.push({ googleSearch: {} });
    }
    
    if (config.enableCodeExecution) {
      tools.push({ codeExecution: {} });
    }

    // Конфигурация генерации
    const generateConfig: Record<string, unknown> = {};
    
    // Добавляем tools если есть
    if (tools.length > 0) {
      generateConfig.tools = tools;
    }

    if (isImageModel) {
      // Используем Modality enum из SDK как в документации
      generateConfig.responseModalities = [Modality.TEXT, Modality.IMAGE];
    }

    // Генерируем ответ
    // Для моделей изображений используем gemini-3-pro-image-preview
    const actualModel = isImageModel ? "gemini-3-pro-image-preview" : model;
    
    console.log(`[AI Studio Chat] Model: ${actualModel}, isImageModel: ${isImageModel}`);
    
    const response = await client.models.generateContent({
      model: actualModel,
      contents,
      config: Object.keys(generateConfig).length > 0 ? generateConfig : undefined,
    });

    // Извлекаем данные из ответа
    let content = "";
    let thinking = "";
    let imageUrl = "";
    const sources: Array<{ title: string; url: string }> = [];
    const codeResults: Array<{ code: string; output: string; language: string }> = [];

    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];

      // Извлекаем текст, мысли, изображения и результаты кода
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          // Проверяем на мысли AI
          if ("thought" in part && part.thought) {
            thinking += (part.text || "") + "\n";
          } 
          // Проверяем на изображение (inlineData)
          else if ("inlineData" in part && part.inlineData) {
            const inlineData = part.inlineData as { data?: string; mimeType?: string };
            if (inlineData.data) {
              imageUrl = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
            }
          }
          // Проверяем на результат выполнения кода
          else if ("executableCode" in part) {
            const execCode = part as { executableCode: { code: string; language: string } };
            codeResults.push({
              code: execCode.executableCode.code || "",
              output: "",
              language: execCode.executableCode.language || "python",
            });
          }
          else if ("codeExecutionResult" in part) {
            const execResult = part as { codeExecutionResult: { output: string } };
            if (codeResults.length > 0) {
              codeResults[codeResults.length - 1].output = execResult.codeExecutionResult.output || "";
            }
          }
          // Обычный текст
          else if ("text" in part) {
            content += part.text || "";
          }
        }
      }

      // Извлекаем источники из grounding metadata (Google Search)
      if (candidate.groundingMetadata?.groundingChunks) {
        for (const chunk of candidate.groundingMetadata.groundingChunks) {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || chunk.web.uri || "Источник",
              url: chunk.web.uri || "",
            });
          }
        }
      }
      
      // Также проверяем searchEntryPoint для Google Search
      if (candidate.groundingMetadata?.searchEntryPoint?.renderedContent) {
        // Есть данные поиска Google
      }
    }

    // Если контент пустой, используем response.text
    if (!content && response.text) {
      content = response.text;
    }

    // Логируем использование
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

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
      imageUrl: imageUrl || undefined,
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
