import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OpenRouterModel {
  id: string;
  name: string;
}

interface FormattedModel {
  id: string;
  name: string;
  is_free: boolean;
}

/**
 * GET - получить список доступных AI моделей из OpenRouter
 */
export async function GET() {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }

    const data = await response.json();
    
    // Фильтруем и сортируем модели
    const models: FormattedModel[] = data.data
      .filter((model: OpenRouterModel) => {
        // Показываем только активные модели
        return model.id && model.name;
      })
      .map((model: OpenRouterModel): FormattedModel => ({
        id: model.id,
        name: model.name,
        is_free: model.id.includes(":free"),
      }))
      .sort((a: FormattedModel, b: FormattedModel) => {
        // Сначала бесплатные, потом по популярности
        if (a.is_free && !b.is_free) return -1;
        if (!a.is_free && b.is_free) return 1;
        return a.name.localeCompare(b.name);
      });

    // Группируем по провайдерам для удобства
    const grouped = {
      recommended: models.filter((m: FormattedModel) => 
        m.id.includes("openai/gpt-4o") ||
        m.id.includes("anthropic/claude") ||
        m.id.includes("google/gemini")
      ),
      free: models.filter((m: FormattedModel) => m.is_free),
      all: models,
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Models API error:", error);
    
    // Возвращаем дефолтные модели в случае ошибки
    return NextResponse.json({
      recommended: [
        {
          id: "openai/gpt-4o-mini",
          name: "GPT-4o Mini",
          is_free: false,
        },
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          is_free: false,
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          is_free: false,
        },
        {
          id: "google/gemini-2.0-flash-exp:free",
          name: "Gemini 2.0 Flash (FREE)",
          is_free: true,
        },
      ],
      free: [
        {
          id: "google/gemini-2.0-flash-exp:free",
          name: "Gemini 2.0 Flash",
          is_free: true,
        },
        {
          id: "meta-llama/llama-3.1-8b-instruct:free",
          name: "Llama 3.1 8B",
          is_free: true,
        },
      ],
      all: [],
    });
  }
}
