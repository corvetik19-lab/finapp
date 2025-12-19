"use server";

import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";

export interface ToolHistoryItem {
  id: string;
  user_id: string;
  tool_id: string;
  input_data: Record<string, unknown>;
  output_url: string | null;
  output_data: Record<string, unknown> | null;
  status: "pending" | "processing" | "completed" | "error";
  error_message: string | null;
  model: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

// Сохранить результат в историю
export async function saveToolHistory(
  toolId: string,
  inputData: Record<string, unknown>,
  outputUrl: string | null,
  outputData: Record<string, unknown> | null,
  status: ToolHistoryItem["status"],
  model: string,
  processingTimeMs: number,
  errorMessage?: string
): Promise<ToolHistoryItem | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_tool_history")
    .insert({
      user_id: user.id,
      tool_id: toolId,
      input_data: inputData,
      output_url: outputUrl,
      output_data: outputData,
      status,
      error_message: errorMessage || null,
      model,
      processing_time_ms: processingTimeMs,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving tool history:", error);
    return null;
  }

  return data;
}

// Получить историю инструмента
export async function getToolHistory(toolId?: string): Promise<ToolHistoryItem[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("ai_tool_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (toolId) {
    query = query.eq("tool_id", toolId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tool history:", error);
    return [];
  }

  return data || [];
}

// Text-to-Speech с Gemini
export async function generateTTS(
  text: string,
  voice: string = "Kore",
  language: string = "ru"
): Promise<{ audioUrl: string; duration: number } | { error: string }> {
  const startTime = Date.now();
  
  try {
    const client = getGeminiClient();
    
    // Используем Gemini для генерации аудио (через multimodal)
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ 
          text: `Generate speech audio for the following text in ${language} language with ${voice} voice style:\n\n${text}` 
        }],
      }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    const processingTime = Date.now() - startTime;

    // Получаем аудио данные
    const audioData = response.candidates?.[0]?.content?.parts?.[0];
    
    if (audioData && "inlineData" in audioData && audioData.inlineData) {
      const base64Audio = audioData.inlineData.data;
      const mimeType = audioData.inlineData.mimeType || "audio/wav";
      const audioUrl = `data:${mimeType};base64,${base64Audio}`;
      
      await saveToolHistory(
        "tts",
        { text, voice, language },
        audioUrl,
        { duration: 0 },
        "completed",
        "gemini-2.0-flash",
        processingTime
      );

      return { audioUrl, duration: 0 };
    }

    throw new Error("No audio data in response");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "tts",
      { text, voice, language },
      null,
      null,
      "error",
      "gemini-2.0-flash",
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}

// Транскрибация с Gemini
export async function transcribeMedia(
  mediaBase64: string,
  mimeType: string
): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> } | { error: string }> {
  const startTime = Date.now();
  
  try {
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: mediaBase64,
            },
          },
          { 
            text: "Транскрибируй это аудио/видео на русском языке. Верни только текст транскрипции без дополнительных комментариев." 
          },
        ],
      }],
    });

    const processingTime = Date.now() - startTime;
    const text = response.text || "";

    await saveToolHistory(
      "transcribe",
      { mimeType },
      null,
      { text },
      "completed",
      "gemini-2.0-flash",
      processingTime
    );

    return { text };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "transcribe",
      { mimeType },
      null,
      null,
      "error",
      "gemini-2.0-flash",
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}

// Генерация изображения (стикеры) через Gemini 3 Pro Image
export async function generateSticker(
  prompt: string,
  config?: {
    aspectRatio?: string;
    numberOfImages?: number;
    negativePrompt?: string;
    seed?: number;
    guidanceScale?: number;
    enhancePrompt?: boolean;
  }
): Promise<{ imageUrl: string } | { error: string }> {
  const startTime = Date.now();
  const MODEL_NAME = "gemini-2.0-flash-preview-image-generation";
  
  try {
    const client = getGeminiClient();
    
    // Формируем промпт с учётом настроек
    let stickerPrompt = `Generate a cute sticker illustration: ${prompt}. Style: kawaii, colorful, clean lines, high quality, professional illustration, suitable for a sticker.`;
    
    // Добавляем негативный промпт если указан
    if (config?.negativePrompt) {
      stickerPrompt += ` Avoid: ${config.negativePrompt}.`;
    } else {
      stickerPrompt += ` Avoid: blurry, low quality, distorted, watermark, text.`;
    }
    
    // Добавляем соотношение сторон
    if (config?.aspectRatio) {
      stickerPrompt += ` Aspect ratio: ${config.aspectRatio}.`;
    }
    
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{
        role: "user",
        parts: [{ text: stickerPrompt }],
      }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const processingTime = Date.now() - startTime;
    
    // Ищем изображение в ответе
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: unknown) => p && typeof p === "object" && "inlineData" in p
    );

    if (imagePart && "inlineData" in imagePart && imagePart.inlineData) {
      const inlineData = imagePart.inlineData as { data?: string; mimeType?: string };
      if (inlineData.data) {
        const imageUrl = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;

        await saveToolHistory(
          "stickers",
          { prompt, config },
          imageUrl,
          null,
          "completed",
          MODEL_NAME,
          processingTime
        );

        return { imageUrl };
      }
    }

    throw new Error("Image generation failed - no image in response");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "stickers",
      { prompt, config },
      null,
      null,
      "error",
      MODEL_NAME,
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}

// Удаление фона
export async function removeBackground(
  imageBase64: string,
  mimeType: string
): Promise<{ imageUrl: string } | { error: string }> {
  const startTime = Date.now();
  
  try {
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { 
            text: "Remove the background from this image. Return only the main subject with transparent background." 
          },
        ],
      }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const processingTime = Date.now() - startTime;
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p) => "inlineData" in p && p.inlineData
    );

    if (imagePart && "inlineData" in imagePart && imagePart.inlineData) {
      const base64Image = imagePart.inlineData.data;
      const outputMimeType = imagePart.inlineData.mimeType || "image/png";
      const imageUrl = `data:${outputMimeType};base64,${base64Image}`;

      await saveToolHistory(
        "bg-remover",
        { mimeType },
        imageUrl,
        null,
        "completed",
        "gemini-2.0-flash",
        processingTime
      );

      return { imageUrl };
    }

    throw new Error("No image data in response");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "bg-remover",
      { mimeType },
      null,
      null,
      "error",
      "gemini-2.0-flash",
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}

// Улучшение качества фото
export async function enhanceImage(
  imageBase64: string,
  mimeType: string
): Promise<{ imageUrl: string } | { error: string }> {
  const startTime = Date.now();
  
  try {
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { 
            text: "Enhance this image: improve quality, sharpen details, enhance colors, remove noise. Return the enhanced version." 
          },
        ],
      }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const processingTime = Date.now() - startTime;
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p) => "inlineData" in p && p.inlineData
    );

    if (imagePart && "inlineData" in imagePart && imagePart.inlineData) {
      const base64Image = imagePart.inlineData.data;
      const outputMimeType = imagePart.inlineData.mimeType || "image/jpeg";
      const imageUrl = `data:${outputMimeType};base64,${base64Image}`;

      await saveToolHistory(
        "enhance",
        { mimeType },
        imageUrl,
        null,
        "completed",
        "gemini-2.0-flash",
        processingTime
      );

      return { imageUrl };
    }

    throw new Error("No image data in response");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "enhance",
      { mimeType },
      null,
      null,
      "error",
      "gemini-2.0-flash",
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}

// Оживление фото (генерация видео)
export async function generateVideoFromImage(
  imageBase64: string,
  mimeType: string,
  prompt?: string
): Promise<{ videoUrl: string } | { error: string }> {
  const startTime = Date.now();
  
  try {
    const client = getGeminiClient();
    
    // Примечание: Veo API может быть недоступен напрямую через стандартный SDK
    // Используем альтернативный подход через Gemini
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { 
            text: prompt 
              ? `Animate this image based on the following description: ${prompt}` 
              : "Create a short animation from this image with subtle movement."
          },
        ],
      }],
      config: {
        responseModalities: ["VIDEO", "TEXT"],
      },
    });

    const processingTime = Date.now() - startTime;
    
    const videoPart = response.candidates?.[0]?.content?.parts?.find(
      (p) => "inlineData" in p && p.inlineData
    );

    if (videoPart && "inlineData" in videoPart && videoPart.inlineData) {
      const base64Video = videoPart.inlineData.data;
      const videoMimeType = videoPart.inlineData.mimeType || "video/mp4";
      const videoUrl = `data:${videoMimeType};base64,${base64Video}`;

      await saveToolHistory(
        "live-photos",
        { mimeType, prompt },
        videoUrl,
        null,
        "completed",
        "veo-3.1",
        processingTime
      );

      return { videoUrl };
    }

    // Если видео не сгенерировано, возвращаем сообщение
    throw new Error("Video generation is not available. Please try again later.");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await saveToolHistory(
      "live-photos",
      { mimeType, prompt },
      null,
      null,
      "error",
      "veo-3.1",
      processingTime,
      errorMessage
    );

    return { error: errorMessage };
  }
}
