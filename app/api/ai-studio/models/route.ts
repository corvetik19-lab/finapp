/**
 * API Route для получения всех моделей OpenRouter
 * GET /api/ai-studio/models
 */

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    is_moderated: boolean;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
}

export interface ModelResponse {
  models: OpenRouterModel[];
  total: number;
  free: number;
  paid: number;
}

export async function GET() {
  try {
    // Проверка авторизации
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[Models API] OPENROUTER_API_KEY not configured");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Получаем модели из OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store", // Без кэша для избежания проблем
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Models API] OpenRouter error: ${response.status}`, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];
    
    console.log(`[Models API] Loaded ${models.length} models`);

    // Сортируем модели: сначала популярные, потом по имени
    const sortedModels = models.sort((a, b) => {
      // Популярные модели в начале
      const popularIds = [
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-haiku",
        "google/gemini-2.0-flash-exp:free",
        "deepseek/deepseek-chat",
        "meta-llama/llama-3.3-70b-instruct",
      ];
      
      const aPopular = popularIds.indexOf(a.id);
      const bPopular = popularIds.indexOf(b.id);
      
      if (aPopular !== -1 && bPopular === -1) return -1;
      if (aPopular === -1 && bPopular !== -1) return 1;
      if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
      
      return a.name.localeCompare(b.name);
    });

    // Считаем бесплатные и платные
    const freeModels = sortedModels.filter(m => 
      parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0
    );
    const paidModels = sortedModels.filter(m => 
      parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0
    );

    const result: ModelResponse = {
      models: sortedModels,
      total: sortedModels.length,
      free: freeModels.length,
      paid: paidModels.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Models API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
