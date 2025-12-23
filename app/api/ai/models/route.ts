import { NextResponse } from "next/server";
import { GEMINI_MODELS_INFO, checkGeminiApiKey } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";

interface FormattedModel {
  id: string;
  name: string;
  is_free: boolean;
  description?: string;
  features?: string[];
}

/**
 * GET - получить список доступных Gemini моделей
 */
export async function GET() {
  // Список доступных Gemini моделей (Vertex AI)
  const geminiModels: FormattedModel[] = [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      is_free: true,
      description: "🚀 Самая новая модель через Vertex AI (по умолчанию)",
      features: ["thinking", "advanced", "recommended", "fast"],
    },
  ];

  // Группировка моделей
  const groupedModels = {
    "Доступные модели": geminiModels,
  };

  // Проверяем доступность API
  let apiAvailable = false;
  try {
    apiAvailable = await checkGeminiApiKey();
  } catch {
    apiAvailable = false;
  }

  return NextResponse.json({
    models: geminiModels,
    grouped: groupedModels,
    modelsInfo: GEMINI_MODELS_INFO,
    total: geminiModels.length,
    apiAvailable,
    provider: "google-gemini",
  });
}
