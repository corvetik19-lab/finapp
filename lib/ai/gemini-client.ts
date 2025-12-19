/**
 * Google Gemini API Client via Vertex AI
 * Интеграция с Google Gemini через Vertex AI (обход гео-блокировки)
 * 
 * Документация: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini
 * 
 * Модели:
 * - gemini-2.5-flash - Быстрая модель
 * - gemini-2.0-flash - Предыдущее поколение
 * - text-embedding-004 - Embeddings (Vertex AI)
 */

import { GoogleGenAI, Type } from "@google/genai";

// Ленивая инициализация клиента
let _client: GoogleGenAI | null = null;

/**
 * Получить клиент Gemini API через Vertex AI
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    // Gemini 3 Pro доступен только в global регионе!
    const location = process.env.GOOGLE_LOCATION || "global";
    
    if (projectId) {
      // Используем Vertex AI (для обхода гео-блокировки)
      console.log(`[Gemini] Initializing with Vertex AI: project=${projectId}, location=${location}`);
      _client = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
      });
    } else {
      // Fallback на обычный API ключ
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Neither GOOGLE_PROJECT_ID nor GEMINI_API_KEY configured");
      }
      console.log("[Gemini] Initializing with API Key");
      _client = new GoogleGenAI({ apiKey });
    }
  }
  return _client;
}

// Отдельный клиент для Veo (только US регионы)
let _veoClient: GoogleGenAI | null = null;

export function getVeoClient(): GoogleGenAI {
  if (!_veoClient) {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    if (projectId) {
      _veoClient = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: "us-central1", // Veo доступен только в US
      });
    } else {
      throw new Error("GOOGLE_PROJECT_ID required for Veo video generation");
    }
  }
  return _veoClient;
}

// Отдельный клиент для Image генерации
// Используем API Key напрямую (не Vertex AI) - там квоты выше
let _imageClient: GoogleGenAI | null = null;

export function getImageClient(): GoogleGenAI {
  if (!_imageClient) {
    // Сначала пробуем API ключ (квоты обычно выше чем в Vertex AI)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      console.log("[Gemini Image] Initializing with API Key (higher quotas)");
      _imageClient = new GoogleGenAI({ apiKey });
    } else {
      // Fallback на Vertex AI
      const projectId = process.env.GOOGLE_PROJECT_ID;
      if (projectId) {
        console.log(`[Gemini Image] Initializing with Vertex AI: project=${projectId}, location=global`);
        _imageClient = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location: "global",
        });
      } else {
        throw new Error("Neither GEMINI_API_KEY nor GOOGLE_PROJECT_ID configured for image generation");
      }
    }
  }
  return _imageClient;
}

/**
 * Модели для разных задач
 */
export const GEMINI_MODELS = {
  // Основная модель для чата и анализа (Gemini 3 Pro)
  CHAT: "gemini-3-pro-preview",
  
  // Продвинутая модель мышления
  PRO: "gemini-2.5-pro",
  
  // Экспериментальная быстрая модель
  FLASH_EXP: "gemini-2.0-flash-exp",
  
  // Быстрая модель для простых задач
  FAST: "gemini-2.5-flash",
  
  // Сверхбыстрая модель
  LITE: "gemini-2.5-flash-lite",
  
  // Модель для embeddings
  EMBEDDINGS: "text-embedding-004",
  
  // Генерация изображений (Gemini 3 Pro Image - Nano Banana)
  IMAGE: "gemini-3-pro-image-preview",
  IMAGE_FAST: "gemini-2.0-flash-exp",
  
  // Генерация видео (Veo 3.1)
  VIDEO: "veo-3.1-generate-preview",
  VIDEO_FAST: "veo-3.1-fast-generate-001",
  
  // Озвучка текста (через Gemini)
  TTS: "gemini-2.0-flash",
  
  // Голосовой ассистент
  LIVE: "gemini-2.0-flash",
} as const;

/**
 * Уровни мышления для Gemini 3 Pro
 */
export const THINKING_LEVELS = {
  LOW: "low",    // Быстрые ответы, минимальная задержка
  HIGH: "high",  // Глубокое reasoning (по умолчанию)
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
 * Информация о моделях Gemini
 */
export const GEMINI_MODELS_INFO = {
  "gemini-3-pro-preview": {
    name: "Gemini 3 Pro",
    description: "🧠 Новейшая модель с Deep Thinking",
    features: ["thinking", "advanced", "recommended"],
    contextWindow: "1M tokens",
  },
  "gemini-3-pro-image-preview": {
    name: "Gemini 3 Pro Image",
    description: "🎨 Генерация и редактирование изображений",
    features: ["image", "thinking"],
    contextWindow: "64K tokens",
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    description: "🧠 Продвинутое мышление для сложных задач",
    features: ["thinking", "advanced"],
    contextWindow: "1M tokens",
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    description: "⚡ Быстрая модель, баланс цена/качество",
    features: ["fast", "costEffective"],
    contextWindow: "1M tokens",
  },
  "gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash-Lite",
    description: "💨 Сверхбыстрая для простых задач",
    features: ["fast", "lite"],
    contextWindow: "1M tokens",
  },
  "gemini-2.5-flash-image": {
    name: "Gemini 2.5 Flash Image",
    description: "🖼️ Быстрая генерация изображений",
    features: ["image", "fast"],
    contextWindow: "64K tokens",
  },
  "veo-3.1-generate-preview": {
    name: "Veo 3.1",
    description: "🎬 720p/1080p видео с нативным аудио",
    features: ["video", "audio"],
    contextWindow: "1K tokens",
  },
  "veo-3.1-fast-generate-preview": {
    name: "Veo 3.1 Fast",
    description: "🎬 Быстрая генерация видео",
    features: ["video", "fast"],
    contextWindow: "1K tokens",
  },
  "gemini-2.5-flash-preview-tts": {
    name: "Gemini TTS",
    description: "🎤 Озвучка текста",
    features: ["tts", "audio"],
    contextWindow: "8K tokens",
  },
  "gemini-2.5-flash-native-audio-preview-12-2025": {
    name: "Gemini Live",
    description: "🎙️ Голосовой ассистент реального времени",
    features: ["live", "audio", "realtime"],
    contextWindow: "128K tokens",
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
