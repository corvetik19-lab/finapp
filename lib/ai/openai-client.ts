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
  // === CHAT MODELS ===
  
  // Основная модель для команд и чата (быстрая и дешёвая)
  COMMANDS: "gpt-4o-mini",
  
  // Для сложного анализа и прогнозов (более мощная)
  ANALYTICS: "gpt-4o",
  
  // Для reasoning задач (глубокое мышление)
  REASONING: "o1-mini",
  
  // Новейшая reasoning модель
  REASONING_ADVANCED: "o3-mini",
  
  // === EMBEDDINGS MODELS ===
  
  // Основная модель для embeddings (1536 dimensions, дешёвая)
  EMBEDDINGS: "text-embedding-3-small",
  
  // Большая модель embeddings (3072 dimensions, точнее)
  EMBEDDINGS_LARGE: "text-embedding-3-large",
  
  // Старая модель (legacy, 1536 dimensions)
  EMBEDDINGS_LEGACY: "text-embedding-ada-002",
} as const;

/**
 * Информация о моделях embeddings
 */
export const EMBEDDINGS_INFO = {
  "text-embedding-3-small": {
    dimensions: 1536,
    cost_per_1m_tokens: 0.02, // USD
    description: "Быстрая и дешёвая модель для большинства задач"
  },
  "text-embedding-3-large": {
    dimensions: 3072,
    cost_per_1m_tokens: 0.13, // USD
    description: "Более точная модель для критичных задач"
  },
  "text-embedding-ada-002": {
    dimensions: 1536,
    cost_per_1m_tokens: 0.10, // USD
    description: "Устаревшая модель (legacy)"
  },
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
