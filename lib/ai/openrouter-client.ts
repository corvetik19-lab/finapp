/**
 * OpenRouter Client для режима Финансы
 * 
 * ВАЖНО: Модели жёстко заданы и НЕ должны меняться через env или настройки!
 * 
 * Chat Model: google/gemini-3-flash-preview
 * Embedding Model: openai/text-embedding-3-large
 */

import { logger } from "@/lib/logger";

// ============================================================================
// ЖЁСТКО ЗАДАННЫЕ МОДЕЛИ - НЕ МЕНЯТЬ!
// ============================================================================

/** Модель для чата - Gemini 3 Flash Preview (быстрая, с Tool Calling, Reasoning) */
export const OPENROUTER_CHAT_MODEL = "google/gemini-3-flash-preview" as const;

/** Модель для embeddings - OpenAI text-embedding-3-small (1536 dimensions, совместимо с Supabase) */
export const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-small" as const;

/** Размерность embeddings - 1536 (максимум для Supabase pgvector индексов) */
export const EMBEDDING_DIMENSIONS = 1536;

// ============================================================================
// ТИПЫ
// ============================================================================

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system" | "tool";
  content?: string | null;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
  reasoning_details?: unknown[]; // Для Gemini 3 reasoning
  name?: string;
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  reasoning?: { max_tokens?: number }; // Для Gemini 3 reasoning
}

export interface OpenRouterChoice {
  index: number;
  message: OpenRouterMessage & { reasoning_details?: unknown[] };
  finish_reason: "stop" | "tool_calls" | "length" | null;
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// КЛИЕНТ
// ============================================================================

class OpenRouterFinanceClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    const key = process.env.OPENROUTER_FINANCE_API_KEY;
    if (!key) {
      throw new Error(
        "OPENROUTER_FINANCE_API_KEY not configured. " +
        "Add it to environment variables for Finance mode AI."
      );
    }
    this.apiKey = key;
    logger.info("[OpenRouter Finance] Client initialized");
  }

  private getHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://finapp.vercel.app",
      "X-Title": "FinApp Finance",
      "Content-Type": "application/json",
    };
  }

  /**
   * Отправить запрос в чат (без стриминга)
   */
  async chat(
    messages: OpenRouterMessage[],
    options?: {
      tools?: OpenRouterTool[];
      tool_choice?: "auto" | "none";
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<OpenRouterResponse> {
    const requestBody: OpenRouterRequest = {
      model: OPENROUTER_CHAT_MODEL,
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
      reasoning: { max_tokens: 2000 }, // Для Gemini 3 reasoning tokens
    };

    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.tool_choice ?? "auto";
    }

    logger.debug("[OpenRouter Finance] Chat request", {
      model: OPENROUTER_CHAT_MODEL,
      messagesCount: messages.length,
      toolsCount: options?.tools?.length ?? 0,
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[OpenRouter Finance] Chat error", { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    logger.debug("[OpenRouter Finance] Chat response", {
      id: data.id,
      finishReason: data.choices?.[0]?.finish_reason,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
    });

    return data;
  }

  /**
   * Отправить запрос в чат со стримингом
   * Возвращает ReadableStream для обработки чанков
   */
  async chatStream(
    messages: OpenRouterMessage[],
    options?: {
      tools?: OpenRouterTool[];
      tool_choice?: "auto" | "none";
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<Response> {
    const requestBody: OpenRouterRequest = {
      model: OPENROUTER_CHAT_MODEL,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
    };

    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.tool_choice ?? "auto";
    }

    logger.debug("[OpenRouter Finance] Chat stream request", {
      model: OPENROUTER_CHAT_MODEL,
      messagesCount: messages.length,
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[OpenRouter Finance] Chat stream error", { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenRouter stream error (${response.status}): ${errorText}`);
    }

    return response;
  }

  /**
   * Создать embedding для одного текста
   */
  async createEmbedding(text: string): Promise<number[]> {
    logger.debug("[OpenRouter Finance] Creating embedding", { 
      textLength: text.length 
    });

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: OPENROUTER_EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[OpenRouter Finance] Embedding error", { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenRouter embedding error (${response.status}): ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    
    if (!data.data?.[0]?.embedding) {
      throw new Error("Invalid embedding response: no embedding data");
    }

    logger.debug("[OpenRouter Finance] Embedding created", {
      dimensions: data.data[0].embedding.length,
      tokens: data.usage?.total_tokens,
    });

    return data.data[0].embedding;
  }

  /**
   * Создать embeddings для нескольких текстов (batch)
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    logger.debug("[OpenRouter Finance] Creating batch embeddings", { 
      count: texts.length 
    });

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: OPENROUTER_EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[OpenRouter Finance] Batch embedding error", { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`OpenRouter batch embedding error (${response.status}): ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    
    // Сортируем по индексу на случай если вернулись не по порядку
    const sorted = data.data.sort((a, b) => a.index - b.index);
    
    logger.debug("[OpenRouter Finance] Batch embeddings created", {
      count: sorted.length,
      tokens: data.usage?.total_tokens,
    });

    return sorted.map(d => d.embedding);
  }

  /**
   * Проверить доступность API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chat([
        { role: "user", content: "Say 'ok'" }
      ], { max_tokens: 10 });
      
      return !!response.choices?.[0]?.message?.content;
    } catch (error) {
      logger.error("[OpenRouter Finance] Health check failed", { error });
      return false;
    }
  }
}

// ============================================================================
// SINGLETON И ЭКСПОРТЫ
// ============================================================================

let client: OpenRouterFinanceClient | null = null;

/**
 * Получить клиент OpenRouter для режима Финансы
 */
export function getOpenRouterClient(): OpenRouterFinanceClient {
  if (!client) {
    client = new OpenRouterFinanceClient();
  }
  return client;
}

/**
 * Сбросить клиент (для тестов или hot reload)
 */
export function resetOpenRouterClient(): void {
  client = null;
}

// Вспомогательные функции для совместимости с существующим кодом
export function getChatModel(): string {
  return OPENROUTER_CHAT_MODEL;
}

export function getEmbeddingsModel(): string {
  return OPENROUTER_EMBEDDING_MODEL;
}

export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSIONS;
}

/**
 * Проверяет доступность OpenRouter API
 */
export async function checkOpenRouterApiKey(): Promise<boolean> {
  const apiKey = process.env.OPENROUTER_FINANCE_API_KEY;
  if (!apiKey) {
    return false;
  }
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Информация о моделях (для UI)
export const OPENROUTER_MODELS_INFO = {
  [OPENROUTER_CHAT_MODEL]: {
    name: "Gemini 3 Flash Preview",
    description: "⚡ Быстрая модель с Tool Calling, Reasoning и 1M контекстом",
    features: ["chat", "tool_calling", "streaming", "reasoning", "multimodal"],
    contextWindow: "1M tokens",
  },
  [OPENROUTER_EMBEDDING_MODEL]: {
    name: "Text Embedding 3 Large",
    description: "🔍 Лучшая модель embeddings от OpenAI",
    features: ["embeddings", "semantic_search"],
    dimensions: EMBEDDING_DIMENSIONS,
  },
} as const;
