import { NextResponse } from "next/server";
import { OPENROUTER_CHAT_MODEL, OPENROUTER_MODELS_INFO, checkOpenRouterApiKey } from "@/lib/ai/openrouter-client";

export const dynamic = "force-dynamic";

interface FormattedModel {
  id: string;
  name: string;
  is_free: boolean;
  description?: string;
  features?: string[];
}

/**
 * GET - получить список доступных моделей для AI чата (OpenRouter)
 */
export async function GET() {
  // Доступные модели через OpenRouter
  const openRouterModels: FormattedModel[] = [
    {
      id: OPENROUTER_CHAT_MODEL,
      name: "Gemini 2.5 Flash (OpenRouter)",
      is_free: false,
      description: "🚀 Google Gemini 2.5 Flash через OpenRouter (по умолчанию)",
      features: ["thinking", "advanced", "recommended", "fast", "tool-calling"],
    },
  ];

  // Группировка моделей
  const groupedModels = {
    "Доступные модели": openRouterModels,
  };

  // Проверяем доступность API
  let apiAvailable = false;
  try {
    apiAvailable = await checkOpenRouterApiKey();
  } catch {
    apiAvailable = false;
  }

  return NextResponse.json({
    models: openRouterModels,
    grouped: groupedModels,
    modelsInfo: OPENROUTER_MODELS_INFO,
    total: openRouterModels.length,
    apiAvailable,
    provider: "openrouter",
  });
}
