import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface TextPart {
  text: string;
}

type ContentPart = ImagePart | TextPart;

/**
 * POST - Генерация и редактирование изображений (Nano Banana Pro)
 * Поддерживает:
 * - Text-to-Image генерацию
 * - Image editing с референсными изображениями
 * - Multi-turn editing
 * - 4K разрешение
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

    const { 
      prompt, 
      model = "gemini-3-pro-image-preview", 
      aspectRatio = "16:9",
      mode = "generate", // "generate" | "edit" | "upscale"
      referenceImages = [], // base64 images for editing/reference (до 14 штук)
      editInstructions = "", // инструкции для редактирования
      resolution = "1024", // "1024" | "2048" | "4096" (4K)
    } = await req.json();

    if (!prompt && mode === "generate") {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    const client = getGeminiClient();

    // Формируем контент в зависимости от режима
    const contents: ContentPart[] = [];

    // Добавляем референсные изображения (до 14 штук)
    if (referenceImages && referenceImages.length > 0) {
      const maxImages = Math.min(referenceImages.length, 14);
      for (let i = 0; i < maxImages; i++) {
        const img = referenceImages[i];
        if (img.base64 && img.mimeType) {
          contents.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
    }

    // Формируем текстовый промпт
    let finalPrompt = prompt;
    if (mode === "edit" && editInstructions) {
      finalPrompt = `Edit this image: ${editInstructions}. ${prompt || ""}`.trim();
    } else if (mode === "upscale") {
      finalPrompt = `Upscale this image to ${resolution}px resolution while preserving all details. ${prompt || ""}`.trim();
    }

    contents.push({ text: finalPrompt });

    // Генерируем изображение
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Извлекаем изображение из ответа
    let imageUrl = "";
    let imageBase64 = "";

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ("inlineData" in part && part.inlineData) {
          imageBase64 = part.inlineData.data || "";
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${imageBase64}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Логируем использование
    await logAIStudioUsage(user.id, null, "image", model, 0, 0, {
      prompt: finalPrompt,
      aspectRatio,
      mode,
      resolution,
      referenceCount: referenceImages?.length || 0,
    });

    return NextResponse.json({
      imageUrl,
      imageBase64,
      mode,
      resolution,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    
    let errorMessage = "Ошибка генерации изображения";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("NOT_FOUND") || error.message.includes("404")) {
        errorMessage = "Модель не найдена. Попробуйте другую модель.";
        statusCode = 404;
      } else if (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("429")) {
        errorMessage = "Превышен лимит запросов. Подождите немного.";
        statusCode = 429;
      } else if (error.message.includes("SAFETY")) {
        errorMessage = "Запрос отклонён по соображениям безопасности.";
        statusCode = 400;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
