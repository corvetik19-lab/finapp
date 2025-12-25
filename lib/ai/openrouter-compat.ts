/**
 * OpenRouter Client Wrapper для режима Финансы
 * 
 * Предоставляет интерфейс для AI-функций финансового модуля.
 * Все вызовы идут через OpenRouter API.
 */

import { 
  getOpenRouterClient, 
  OPENROUTER_CHAT_MODEL,
  type OpenRouterMessage,
} from "./openrouter-client";
import { logger } from "@/lib/logger";

// Модели OpenRouter для режима Финансы
export const OPENROUTER_MODELS = {
  CHAT: OPENROUTER_CHAT_MODEL,
  FAST: OPENROUTER_CHAT_MODEL,
  EMBEDDINGS: "openai/text-embedding-3-small",
} as const;

// Alias для обратной совместимости со старым кодом
export const GEMINI_MODELS = OPENROUTER_MODELS;

/**
 * Интерфейс ответа совместимый со старым Gemini API
 */
interface CompatResponse {
  text: string | null;
  functionCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

/**
 * Обёртка клиента совместимая с getGeminiClient()
 */
class OpenRouterCompatClient {
  private client = getOpenRouterClient();

  models = {
    /**
     * Генерация контента (совместимо с Gemini generateContent)
     */
    generateContent: async (params: {
      model: string;
      contents: string | OpenRouterMessage[];
      config?: {
        responseMimeType?: string;
        tools?: Array<{ functionDeclarations: unknown[] }>;
      };
    }): Promise<CompatResponse> => {
      try {
        // Формируем сообщения
        const messages: OpenRouterMessage[] = [];
        
        if (typeof params.contents === "string") {
          messages.push({ role: "user", content: params.contents });
        } else if (Array.isArray(params.contents)) {
          messages.push(...params.contents);
        }

        // Определяем нужен ли JSON ответ
        const wantJson = params.config?.responseMimeType === "application/json";

        // Если нужен JSON, добавляем инструкцию в системный промпт
        if (wantJson) {
          messages.unshift({
            role: "system",
            content: "You must respond with valid JSON only. No markdown, no explanations, just JSON.",
          });
        }

        const response = await this.client.chat(messages, {
          temperature: wantJson ? 0.3 : 0.7,
          max_tokens: 4096,
        });

        const content = response.choices[0]?.message?.content || "";
        
        // Проверяем tool calls
        const toolCalls = response.choices[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          return {
            text: content,
            functionCalls: toolCalls.map(tc => ({
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || "{}"),
            })),
          };
        }

        return { text: content };
      } catch (error) {
        logger.error("[OpenRouter Compat] generateContent error:", error);
        throw error;
      }
    },
  };
}

// Singleton
let compatClient: OpenRouterCompatClient | null = null;

/**
 * Получить клиент совместимый с getGeminiClient()
 * Используется для миграции файлов с Gemini на OpenRouter
 */
export function getGeminiClient(): OpenRouterCompatClient {
  if (!compatClient) {
    compatClient = new OpenRouterCompatClient();
  }
  return compatClient;
}

/**
 * Получить клиент OpenRouter напрямую (рекомендуется для нового кода)
 */
export { getOpenRouterClient } from "./openrouter-client";
