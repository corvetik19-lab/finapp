/**
 * OpenAI API Client
 * Официальная интеграция с OpenAI API
 * 
 * Документация: https://platform.openai.com/docs/api-reference/introduction
 * Доступные модели: https://platform.openai.com/docs/models
 * 
 * Примеры моделей:
 * - gpt-4o - GPT-4 Optimized (самая мощная)
 * - gpt-4o-mini - GPT-4 Mini (быстрая и дешёвая)
 * - gpt-4-turbo - GPT-4 Turbo
 * - gpt-3.5-turbo - GPT-3.5 Turbo (дешёвая)
 */

const OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * Официальный клиент OpenAI API
 * 
 * ВАЖНО: Этот клиент должен использоваться ТОЛЬКО на сервере (в API routes)
 */
export const openai = {
  /**
   * Проверяет доступность API ключа
   */
  async checkApiKey(): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return false;

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/models`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Получает список доступных моделей
   */
  async getModels() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch(`${OPENAI_BASE_URL}/models`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return await response.json();
  },
};

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
  COMMANDS: "gpt-4o-mini",
  
  // Для сложного анализа и прогнозов (более мощная)
  ANALYTICS: "gpt-4o",
  
  // Для embeddings
  EMBEDDINGS: "text-embedding-3-small",
} as const;

/**
 * Вспомогательная функция для получения модели команд
 */
export function getCommandsModel() {
  return MODELS.COMMANDS;
}

/**
 * Вспомогательная функция для получения модели аналитики
 */
export function getAnalyticsModel() {
  return MODELS.ANALYTICS;
}
