import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FormattedModel {
  id: string;
  name: string;
  is_free: boolean;
  description?: string;
}

/**
 * GET - получить список доступных OpenAI моделей
 * Используем статический список актуальных моделей OpenAI
 */
export async function GET() {
  // Полный список актуальных OpenAI моделей (обновлено: ноябрь 2025)
  const openaiModels: FormattedModel[] = [
    // === REASONING MODELS (o-series) ===
    {
      id: "o1",
      name: "o1 (Reasoning)",
      is_free: false,
      description: "🧠 Продвинутое мышление для сложных задач (медленнее, но умнее)"
    },
    {
      id: "o1-mini",
      name: "o1-mini (Reasoning)",
      is_free: false,
      description: "🧠 Быстрое reasoning для повседневных задач"
    },
    {
      id: "o3-mini",
      name: "o3-mini (Latest Reasoning)",
      is_free: false,
      description: "🧠 Новейшая reasoning модель (январь 2025)"
    },
    {
      id: "o1-preview",
      name: "o1-preview",
      is_free: false,
      description: "🧪 Preview версия o1"
    },

    // === GPT-4o SERIES (Optimized) ===
    {
      id: "gpt-4o",
      name: "GPT-4o",
      is_free: false,
      description: "⚡ Самая мощная и быстрая GPT-4 модель"
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      is_free: false,
      description: "💰 Быстрая и экономичная (рекомендуется для чата)"
    },
    {
      id: "chatgpt-4o-latest",
      name: "ChatGPT-4o Latest",
      is_free: false,
      description: "🆕 Последняя версия ChatGPT-4o"
    },

    // === GPT-4 TURBO ===
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      is_free: false,
      description: "📚 Большое контекстное окно (128K токенов)"
    },
    {
      id: "gpt-4-turbo-preview",
      name: "GPT-4 Turbo Preview",
      is_free: false,
      description: "🧪 Preview версия GPT-4 Turbo"
    },

    // === GPT-4 CLASSIC ===
    {
      id: "gpt-4",
      name: "GPT-4",
      is_free: false,
      description: "🎯 Классическая GPT-4 (8K контекст)"
    },
    {
      id: "gpt-4-32k",
      name: "GPT-4 32K",
      is_free: false,
      description: "📖 GPT-4 с расширенным контекстом (32K)"
    },

    // === GPT-3.5 ===
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      is_free: false,
      description: "💸 Самая дешёвая модель для простых задач"
    },
    {
      id: "gpt-3.5-turbo-16k",
      name: "GPT-3.5 Turbo 16K",
      is_free: false,
      description: "📝 GPT-3.5 с расширенным контекстом"
    },
  ];

  const grouped = {
    recommended: [
      openaiModels[5],  // gpt-4o-mini - лучшее соотношение цена/качество
      openaiModels[4],  // gpt-4o - для сложных задач
      openaiModels[1],  // o1-mini - для reasoning задач
    ],
    free: [], // OpenAI не предоставляет бесплатных моделей
    reasoning: [
      openaiModels[0],  // o1
      openaiModels[1],  // o1-mini
      openaiModels[2],  // o3-mini
      openaiModels[3],  // o1-preview
    ],
    gpt4o: [
      openaiModels[4],  // gpt-4o
      openaiModels[5],  // gpt-4o-mini
      openaiModels[6],  // chatgpt-4o-latest
    ],
    gpt4: [
      openaiModels[7],  // gpt-4-turbo
      openaiModels[8],  // gpt-4-turbo-preview
      openaiModels[9],  // gpt-4
      openaiModels[10], // gpt-4-32k
    ],
    other: [
      openaiModels[11], // gpt-3.5-turbo
      openaiModels[12], // gpt-3.5-turbo-16k
    ],
    all: openaiModels,
  };

  return NextResponse.json(grouped);
}
