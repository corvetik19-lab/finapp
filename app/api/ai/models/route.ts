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
    // === GPT-5 SERIES (Latest Generation) ===
    {
      id: "gpt-5",
      name: "GPT-5",
      is_free: false,
      description: "🚀 Новейшая флагманская модель GPT-5"
    },
    {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      is_free: false,
      description: "⚡ Компактная версия GPT-5"
    },
    {
      id: "gpt-5-nano",
      name: "GPT-5 Nano",
      is_free: false,
      description: "💨 Сверхбыстрая GPT-5 для простых задач"
    },
    {
      id: "gpt-5-chat-latest",
      name: "GPT-5 Chat Latest",
      is_free: false,
      description: "💬 Последняя версия GPT-5 для чата"
    },
    {
      id: "gpt-5-codex",
      name: "GPT-5 Codex",
      is_free: false,
      description: "👨‍💻 GPT-5 оптимизированная для кода"
    },
    {
      id: "gpt-5-pro",
      name: "GPT-5 Pro",
      is_free: false,
      description: "💎 Премиум версия GPT-5"
    },
    {
      id: "gpt-5-search-api",
      name: "GPT-5 Search API",
      is_free: false,
      description: "🔍 GPT-5 с поиском в интернете"
    },

    // === GPT-4.1 SERIES ===
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      is_free: false,
      description: "🎯 Улучшенная версия GPT-4"
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      is_free: false,
      description: "💰 Экономичная GPT-4.1"
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      is_free: false,
      description: "⚡ Быстрая GPT-4.1"
    },

    // === GPT-4o SERIES (Optimized) ===
    {
      id: "gpt-4o",
      name: "GPT-4o",
      is_free: false,
      description: "⚡ Мощная и быстрая GPT-4 модель"
    },
    {
      id: "gpt-4o-2024-05-13",
      name: "GPT-4o (2024-05-13)",
      is_free: false,
      description: "📅 Стабильная версия GPT-4o"
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      is_free: false,
      description: "💰 Быстрая и экономичная (рекомендуется)"
    },
    {
      id: "gpt-4o-search-preview",
      name: "GPT-4o Search Preview",
      is_free: false,
      description: "🔍 GPT-4o с поиском (preview)"
    },
    {
      id: "gpt-4o-mini-search-preview",
      name: "GPT-4o Mini Search Preview",
      is_free: false,
      description: "🔍 GPT-4o Mini с поиском"
    },

    // === REALTIME MODELS ===
    {
      id: "gpt-realtime",
      name: "GPT Realtime",
      is_free: false,
      description: "🎙️ Реалтайм модель для голосового взаимодействия"
    },
    {
      id: "gpt-realtime-mini",
      name: "GPT Realtime Mini",
      is_free: false,
      description: "🎙️ Компактная realtime модель"
    },
    {
      id: "gpt-4o-realtime-preview",
      name: "GPT-4o Realtime Preview",
      is_free: false,
      description: "🎙️ GPT-4o для реалтайм (preview)"
    },
    {
      id: "gpt-4o-mini-realtime-preview",
      name: "GPT-4o Mini Realtime Preview",
      is_free: false,
      description: "🎙️ GPT-4o Mini realtime"
    },

    // === AUDIO MODELS ===
    {
      id: "gpt-audio",
      name: "GPT Audio",
      is_free: false,
      description: "🔊 Модель для работы с аудио"
    },
    {
      id: "gpt-audio-mini",
      name: "GPT Audio Mini",
      is_free: false,
      description: "🔊 Компактная audio модель"
    },
    {
      id: "gpt-4o-audio-preview",
      name: "GPT-4o Audio Preview",
      is_free: false,
      description: "🔊 GPT-4o audio (preview)"
    },
    {
      id: "gpt-4o-mini-audio-preview",
      name: "GPT-4o Mini Audio Preview",
      is_free: false,
      description: "🔊 GPT-4o Mini audio"
    },

    // === REASONING MODELS (o-series) ===
    {
      id: "o1",
      name: "o1",
      is_free: false,
      description: "🧠 Продвинутое reasoning"
    },
    {
      id: "o1-mini",
      name: "o1-mini",
      is_free: false,
      description: "🧠 Быстрое reasoning"
    },
    {
      id: "o1-pro",
      name: "o1-pro",
      is_free: false,
      description: "💎 Премиум reasoning модель"
    },
    {
      id: "o3",
      name: "o3",
      is_free: false,
      description: "🧠 Новое поколение reasoning"
    },
    {
      id: "o3-mini",
      name: "o3-mini",
      is_free: false,
      description: "🧠 Компактная o3"
    },
    {
      id: "o3-pro",
      name: "o3-pro",
      is_free: false,
      description: "💎 Премиум o3"
    },
    {
      id: "o3-deep-research",
      name: "o3 Deep Research",
      is_free: false,
      description: "🔬 o3 для глубоких исследований"
    },
    {
      id: "o4-mini",
      name: "o4-mini",
      is_free: false,
      description: "🧠 Новейшая компактная reasoning"
    },
    {
      id: "o4-mini-deep-research",
      name: "o4-mini Deep Research",
      is_free: false,
      description: "🔬 o4-mini для исследований"
    },

    // === SPECIALIZED MODELS ===
    {
      id: "codex-mini-latest",
      name: "Codex Mini Latest",
      is_free: false,
      description: "👨‍💻 Последняя версия Codex Mini"
    },
    {
      id: "computer-use-preview",
      name: "Computer Use Preview",
      is_free: false,
      description: "🖥️ Модель для управления компьютером"
    },
    {
      id: "gpt-image-1",
      name: "GPT Image 1",
      is_free: false,
      description: "🎨 Модель для работы с изображениями"
    },
    {
      id: "gpt-image-1-mini",
      name: "GPT Image 1 Mini",
      is_free: false,
      description: "🎨 Компактная image модель"
    },

    // === GPT-4 CLASSIC (Legacy) ===
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      is_free: false,
      description: "📚 Большое контекстное окно (128K)"
    },
    {
      id: "gpt-4",
      name: "GPT-4",
      is_free: false,
      description: "🎯 Классическая GPT-4"
    },

    // === EMBEDDINGS MODELS ===
    {
      id: "text-embedding-3-large",
      name: "Text Embedding 3 Large",
      is_free: false,
      description: "🔍 Лучшая модель для embeddings (3072 dimensions)"
    },
    {
      id: "text-embedding-3-small",
      name: "Text Embedding 3 Small",
      is_free: false,
      description: "⚡ Быстрая модель для embeddings (1536 dimensions)"
    },
    {
      id: "text-embedding-ada-002",
      name: "Text Embedding Ada 002",
      is_free: false,
      description: "📦 Legacy embedding модель"
    },

    // === GPT-3.5 (Legacy) ===
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      is_free: false,
      description: "💸 Самая дешёвая модель"
    },
  ];

  const grouped = {
    // Рекомендуемые - топ-5 для повседневного использования
    recommended: openaiModels.filter(m => 
      ['gpt-4o-mini', 'gpt-5-mini', 'gpt-4o', 'o1-mini', 'gpt-4.1-mini'].includes(m.id)
    ),
    free: [], // OpenAI не предоставляет бесплатных моделей
    
    // GPT-5 серия - новейшее поколение
    gpt5: openaiModels.filter(m => m.id.startsWith('gpt-5')),
    
    // GPT-4.1 серия - улучшенная GPT-4
    gpt41: openaiModels.filter(m => m.id.startsWith('gpt-4.1')),
    
    // GPT-4o серия - оптимизированные модели
    gpt4o: openaiModels.filter(m => 
      m.id.startsWith('gpt-4o') && !m.id.includes('realtime') && !m.id.includes('audio')
    ),
    
    // Reasoning модели - для сложных логических задач
    reasoning: openaiModels.filter(m => 
      m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('o4')
    ),
    
    // Realtime модели - для голосового взаимодействия
    realtime: openaiModels.filter(m => m.id.includes('realtime')),
    
    // Audio модели - для работы с аудио
    audio: openaiModels.filter(m => m.id.includes('audio')),
    
    // Специализированные модели
    specialized: openaiModels.filter(m => 
      ['codex-mini-latest', 'computer-use-preview', 'gpt-image-1', 'gpt-image-1-mini'].includes(m.id)
    ),
    
    // Embeddings модели - для векторного поиска
    embeddings: openaiModels.filter(m => m.id.startsWith('text-embedding')),
    
    // GPT-4 классика - проверенные модели
    gpt4: openaiModels.filter(m => 
      m.id === 'gpt-4-turbo' || m.id === 'gpt-4'
    ),
    
    // Другие модели - GPT-3.5 для простых задач
    other: openaiModels.filter(m => m.id.startsWith('gpt-3.5')),
    
    // Все модели без дубликатов
    all: openaiModels,
  };

  return NextResponse.json(grouped);
}
