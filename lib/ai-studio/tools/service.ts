"use server";

import { createRouteClient } from "@/lib/supabase/server";

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

// Text-to-Speech - недоступно через OpenRouter
export async function generateTTS(
  text: string,
  voice: string = "Kore",
  language: string = "ru"
): Promise<{ audioUrl: string; duration: number } | { error: string }> {
  await saveToolHistory(
    "tts",
    { text, voice, language },
    null,
    null,
    "error",
    "unavailable",
    0,
    "TTS недоступен через OpenRouter"
  );
  return { error: "TTS недоступен. Используйте Web Speech API в браузере." };
}

// Транскрибация - недоступно через OpenRouter
export async function transcribeMedia(
  mediaBase64: string,
  mimeType: string
): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> } | { error: string }> {
  void mediaBase64; // suppress unused warning
  await saveToolHistory(
    "transcribe",
    { mimeType },
    null,
    null,
    "error",
    "unavailable",
    0,
    "Транскрибация недоступна через OpenRouter"
  );
  return { error: "Транскрибация недоступна через OpenRouter" };
}

// Генерация стикеров - недоступно через OpenRouter
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
  void config; // suppress unused warning
  await saveToolHistory("stickers", { prompt }, null, null, "error", "unavailable", 0, "Генерация стикеров недоступна через OpenRouter");
  return { error: "Генерация стикеров недоступна через OpenRouter" };
}

// Удаление фона - недоступно через OpenRouter
export async function removeBackground(
  imageBase64: string,
  mimeType: string
): Promise<{ imageUrl: string } | { error: string }> {
  void imageBase64; // suppress unused warning
  await saveToolHistory("bg-remover", { mimeType }, null, null, "error", "unavailable", 0, "Удаление фона недоступно через OpenRouter");
  return { error: "Удаление фона недоступно через OpenRouter" };
}

// Улучшение изображения - недоступно через OpenRouter
export async function enhanceImage(
  imageBase64: string,
  mimeType: string
): Promise<{ imageUrl: string } | { error: string }> {
  void imageBase64; // suppress unused warning
  await saveToolHistory("enhance", { mimeType }, null, null, "error", "unavailable", 0, "Улучшение изображения недоступно через OpenRouter");
  return { error: "Улучшение изображения недоступно через OpenRouter" };
}

// Генерация видео из изображения - недоступно через OpenRouter
export async function generateVideoFromImage(
  imageBase64: string,
  mimeType: string,
  prompt?: string
): Promise<{ videoUrl: string } | { error: string }> {
  void imageBase64; // suppress unused warning
  await saveToolHistory("live-photos", { mimeType, prompt }, null, null, "error", "unavailable", 0, "Генерация видео недоступна через OpenRouter");
  return { error: "Генерация видео недоступна через OpenRouter" };
}
