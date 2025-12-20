/**
 * AI Studio Models Configuration
 * Конфигурация текстовых моделей Gemini для чата
 * Документация: https://ai.google.dev/gemini-api/docs/models
 * 
 * Для генерации изображений, видео и аудио используйте Kie.ai
 */

import type { AIStudioModel } from "./types";

export const AI_STUDIO_MODELS: Record<string, Record<string, AIStudioModel>> = {
  // ═══════════════════════════════════════════════════════════════
  // ЧАТ - Текстовые модели Gemini
  // ═══════════════════════════════════════════════════════════════
  chat: {
    "gemini-3-flash-preview": {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash",
      description: "Новейшая модель: рассуждения Gemini 3 Pro + скорость Flash",
      inputTokens: 1_048_576,
      outputTokens: 65_536,
      features: {
        thinking: true,
        thinkingLevels: ["minimal", "low", "medium", "high"],
        googleSearch: true,
        urlContext: true,
        codeExecution: true,
        fileSearch: true,
        structuredOutput: true,
        functionCalling: true,
        mediaResolution: ["low", "medium", "high", "ultra_high"],
      },
      inputs: ["text", "image", "video", "audio", "pdf"],
      outputs: ["text"],
    },
    "gemini-3-pro-preview": {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro",
      description: "Лучшая модель для мультимодального понимания и агентного анализа",
      inputTokens: 1_048_576,
      outputTokens: 65_536,
      features: {
        thinking: true,
        thinkingLevels: ["low", "medium", "high"],
        googleSearch: true,
        urlContext: true,
        codeExecution: true,
        fileSearch: true,
        structuredOutput: true,
        functionCalling: true,
      },
      inputs: ["text", "image", "video", "audio", "pdf"],
      outputs: ["text"],
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Мощная модель для сложных задач с глубоким мышлением",
      inputTokens: 1_048_576,
      outputTokens: 65_536,
      features: {
        thinking: true,
        googleSearch: true,
        urlContext: true,
        codeExecution: true,
        structuredOutput: true,
        functionCalling: true,
      },
      inputs: ["text", "image", "video", "audio"],
      outputs: ["text"],
    },
    "gemini-2.5-flash": {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Быстрая модель с отличным соотношением цены и качества",
      inputTokens: 1_048_576,
      outputTokens: 65_536,
      features: {
        thinking: true,
        googleSearch: true,
        googleMaps: true,
        urlContext: true,
        codeExecution: true,
        structuredOutput: true,
        functionCalling: true,
      },
      inputs: ["text", "image", "video", "audio"],
      outputs: ["text"],
    },
    "gemini-2.5-flash-lite-preview": {
      id: "gemini-2.5-flash-lite-preview",
      name: "Gemini 2.5 Flash-Lite",
      description: "Сверхбыстрая модель для простых задач",
      inputTokens: 1_048_576,
      outputTokens: 65_536,
      features: {
        thinking: true,
        structuredOutput: true,
      },
      inputs: ["text", "image", "video", "audio"],
      outputs: ["text"],
    },
  },
};

/**
 * Категории моделей (только чат, остальное в Kie.ai)
 */
export type ModelCategory = "chat";

/**
 * Получить конфигурацию модели по ID
 */
export function getModelConfig(modelId: string): AIStudioModel | null {
  return AI_STUDIO_MODELS.chat[modelId] || null;
}

/**
 * Получить модель по умолчанию
 */
export function getDefaultModel(): string {
  return "gemini-3-flash-preview";
}

/**
 * Получить все модели чата
 */
export function getChatModels(): AIStudioModel[] {
  return Object.values(AI_STUDIO_MODELS.chat);
}

/**
 * Получить название категории на русском
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCategoryName(category: ModelCategory): string {
  return "Чат";
}
