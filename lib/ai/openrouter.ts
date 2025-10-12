import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenRouter - агрегатор AI моделей
 * Документация: https://openrouter.ai/docs
 * 
 * Доступные модели: https://openrouter.ai/models
 * Примеры популярных моделей:
 * - openai/gpt-4o - GPT-4 Optimized
 * - openai/gpt-4o-mini - GPT-4 Mini (быстрая и дешёвая)
 * - anthropic/claude-3.5-sonnet - Claude 3.5 Sonnet
 * - google/gemini-2.0-flash-exp:free - Gemini 2.0 Flash (бесплатная)
 * - meta-llama/llama-3.1-70b-instruct - Llama 3.1 70B
 * - mistralai/mistral-large - Mistral Large
 * - qwen/qwen-2.5-72b-instruct - Qwen 2.5 72B
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn(
    "⚠️ OPENROUTER_API_KEY не найден. AI функции не будут работать."
  );
}

/**
 * Клиент OpenRouter (совместим с OpenAI SDK)
 */
export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://finappka.vercel.app",
    "X-Title": "FinApp - Финансовый трекер",
  },
});

/**
 * Модели для разных задач
 * 
 * Вы можете легко менять модели для оптимизации:
 * - Скорости
 * - Стоимости
 * - Качества ответов
 */
export const MODELS = {
  // Основная модель для команд и анализа (быстрая и дешёвая)
  COMMANDS: "openai/gpt-4o-mini",
  
  // Для сложного анализа и прогнозов (более мощная)
  ANALYTICS: "openai/gpt-4o",
  
  // Альтернативы (раскомментируйте чтобы использовать):
  // COMMANDS: "google/gemini-2.0-flash-exp:free", // Бесплатная модель Google
  // COMMANDS: "anthropic/claude-3.5-sonnet", // Claude для более точных ответов
  // COMMANDS: "meta-llama/llama-3.1-70b-instruct", // Llama 3.1 для открытых моделей
  // COMMANDS: "qwen/qwen-2.5-72b-instruct", // Qwen для мультиязычности
} as const;

/**
 * Вспомогательная функция для получения модели команд
 */
export function getCommandsModel() {
  return openrouter(MODELS.COMMANDS);
}

/**
 * Вспомогательная функция для получения модели аналитики
 */
export function getAnalyticsModel() {
  return openrouter(MODELS.ANALYTICS);
}
