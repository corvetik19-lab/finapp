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
  // Статический список актуальных OpenAI моделей
  const openaiModels: FormattedModel[] = [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      is_free: false,
      description: "Самая мощная и быстрая модель OpenAI"
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      is_free: false,
      description: "Быстрая и экономичная модель для повседневных задач"
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      is_free: false,
      description: "Предыдущее поколение с большим контекстным окном"
    },
    {
      id: "gpt-4",
      name: "GPT-4",
      is_free: false,
      description: "Классическая модель GPT-4"
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      is_free: false,
      description: "Быстрая и доступная модель"
    },
  ];

  const grouped = {
    recommended: [
      openaiModels[1], // gpt-4o-mini - рекомендуем как основную
      openaiModels[0], // gpt-4o - для сложных задач
    ],
    free: [], // OpenAI не предоставляет бесплатных моделей
    other: [
      openaiModels[2], // gpt-4-turbo
      openaiModels[3], // gpt-4
      openaiModels[4], // gpt-3.5-turbo
    ],
    all: openaiModels,
  };

  return NextResponse.json(grouped);
}
