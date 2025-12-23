/**
 * Google Gemini 3 API Client
 * Интеграция с Google Gemini 3 API для финансового ассистента
 * 
 * Гео-блокировка обходится через Vercel:
 * - API routes выполняются на серверах Vercel в US регионах
 * - preferredRegion = ["iad1"] (Washington DC)
 * 
 * Документация: https://ai.google.dev/gemini-api/docs/gemini-3
 * 
 * Модели Gemini 3 (Preview):
 * - gemini-3-flash-preview - Быстрая модель с Function Calling и Thinking
 * - gemini-3-pro-preview - Продвинутая модель с Deep Thinking
 * - gemini-3-pro-image-preview - Генерация изображений
 * - text-embedding-004 - Embeddings
 */

import { GoogleGenAI, Type } from "@google/genai";

// Ленивая инициализация клиента
let _client: GoogleGenAI | null = null;

// Сброс клиента для dev mode
export function resetGeminiClient() {
  _client = null;
}

/**
 * Получить клиент Gemini API
 * Использует GEMINI_API_KEY (гео обходится через Vercel US regions)
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured. Add it to environment variables.");
    }
    
    console.log("[Gemini] Initializing with API Key (Vercel handles geo via US regions)");
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// Клиент для генерации изображений (использует тот же API Key)
export function getImageClient(): GoogleGenAI {
  return getGeminiClient();
}

/**
 * Модели Gemini 3 для разных задач
 * Документация: https://ai.google.dev/gemini-api/docs/gemini-3
 * 
 * Gemini 3 модели (все поддерживают Function Calling и Thinking):
 * - gemini-3-flash-preview - Быстрая модель (1M tokens context)
 * - gemini-3-pro-preview - Продвинутая модель с Deep Thinking (1M tokens)
 * - gemini-3-pro-image-preview - Генерация изображений (64K tokens)
 */
export const GEMINI_MODELS = {
  // Основная модель для чата - Gemini 2.0 Flash (стабильная, Function Calling)
  // Gemini 3 модели в Preview могут быть недоступны в некоторых регионах
  CHAT: "gemini-2.0-flash",
  
  // Продвинутая модель - Gemini 2.5 Pro
  PRO: "gemini-2.5-pro-preview-06-05",
  
  // Быстрая модель - Gemini 2.0 Flash
  FAST: "gemini-2.0-flash",
  
  // Flash модель
  FLASH: "gemini-2.0-flash",
  
  // Модель для embeddings
  EMBEDDINGS: "text-embedding-004",
  
  // Генерация изображений - Gemini 3 Pro Image
  IMAGE: "gemini-3-pro-image-preview",
  
  // Генерация видео (Veo 3.1)
  VIDEO: "veo-3.1-generate-preview",
  VIDEO_FAST: "veo-3.1-fast-generate-001",
  
  // Озвучка текста - Gemini 3 Flash
  TTS: "gemini-3-flash-preview",
  
  // Голосовой ассистент - Gemini 3 Flash
  LIVE: "gemini-3-flash-preview",
} as const;

/**
 * Уровни мышления для Gemini 3
 * 
 * Gemini 3 Pro: low, high
 * Gemini 3 Flash: minimal, low, medium, high
 */
export const THINKING_LEVELS = {
  MINIMAL: "minimal", // Почти без размышлений (только Flash)
  LOW: "low",         // Минимальная задержка
  MEDIUM: "medium",   // Сбалансированное мышление (только Flash)
  HIGH: "high",       // Глубокое reasoning (по умолчанию)
} as const;

/**
 * Размерности embeddings
 */
export const EMBEDDING_DIMENSIONS = {
  SMALL: 768,    // Быстрее, меньше места
  MEDIUM: 1536,  // Баланс
  LARGE: 3072,   // Максимальная точность
} as const;

/**
 * Информация о моделях Gemini 3
 */
export const GEMINI_MODELS_INFO = {
  "gemini-3-pro-preview": {
    name: "Gemini 3 Pro",
    description: "🧠 Новейшая модель с Deep Thinking",
    features: ["thinking", "advanced", "recommended", "function_calling"],
    contextWindow: "1M tokens",
  },
  "gemini-3-flash-preview": {
    name: "Gemini 3 Flash",
    description: "⚡ Быстрая модель Gemini 3 с Function Calling",
    features: ["fast", "function_calling", "thinking"],
    contextWindow: "1M tokens",
  },
  "gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro Image",
    description: "🎨 Генерация и редактирование изображений",
    features: ["image", "thinking"],
    contextWindow: "64K tokens",
  },
  "veo-3.1-generate-preview": {
    name: "Veo 3.1",
    description: "🎬 720p/1080p видео с нативным аудио",
    features: ["video", "audio"],
    contextWindow: "1K tokens",
  },
  "veo-3.1-fast-generate-001": {
    name: "Veo 3.1 Fast",
    description: "🎬 Быстрая генерация видео",
    features: ["video", "fast"],
    contextWindow: "1K tokens",
  },
  "text-embedding-004": {
    name: "Text Embedding 004",
    description: "🔍 Векторизация текста",
    features: ["embeddings"],
    dimensions: [768],
  },
} as const;

/**
 * Проверяет доступность API ключа
 */
export async function checkGeminiApiKey(): Promise<boolean> {
  try {
    const client = getGeminiClient();
    // Простой тест - генерация короткого текста
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.FAST,
      contents: "Say 'ok'",
    });
    return !!response.text;
  } catch {
    return false;
  }
}

/**
 * Типы для function calling в Gemini
 */
export { Type };

/**
 * Создаёт конфигурацию для function declarations в формате Gemini
 */
export function createFunctionDeclaration(
  name: string,
  description: string,
  parameters: {
    type: typeof Type.OBJECT;
    properties: Record<string, {
      type: typeof Type.STRING | typeof Type.NUMBER | typeof Type.BOOLEAN | typeof Type.ARRAY;
      description: string;
      enum?: string[];
      items?: { type: typeof Type.STRING | typeof Type.NUMBER };
    }>;
    required?: string[];
  }
) {
  return {
    name,
    description,
    parameters,
  };
}

/**
 * Вспомогательные функции для получения моделей
 */
export function getChatModel() {
  return GEMINI_MODELS.CHAT;
}

export function getFastModel() {
  return GEMINI_MODELS.FAST;
}

export function getEmbeddingsModel() {
  return GEMINI_MODELS.EMBEDDINGS;
}

/**
 * Получить размерность embeddings (по умолчанию 768)
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSIONS.SMALL;
}
