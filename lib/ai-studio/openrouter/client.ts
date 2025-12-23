/**
 * OpenRouter API Client
 * Единый клиент для доступа к 400+ моделям через OpenRouter API
 * 
 * Документация: https://openrouter.ai/docs
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterConfig {
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export interface Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenRouterPlugin {
  id: string;
  config?: Record<string, unknown>;
}

export interface ReasoningConfig {
  enabled?: boolean;
  effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  max_tokens?: number;
  exclude?: boolean;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  tools?: Tool[];
  tool_choice?: "none" | "auto" | { type: "function"; function: { name: string } };
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: Record<string, unknown> };
  user?: string;
  plugins?: OpenRouterPlugin[];
  reasoning?: ReasoningConfig;
  seed?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  parallel_tool_calls?: boolean;
}

export interface ReasoningDetail {
  type: "thinking" | "text";
  thinking?: string;
  text?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    reasoning?: string;
    reasoning_details?: ReasoningDetail[];
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface UrlCitation {
  url: string;
  title: string;
  content?: string;
  start_index?: number;
  end_index?: number;
}

export interface Annotation {
  type: "url_citation";
  url_citation: UrlCitation;
}

export interface StreamDelta {
  role?: "assistant";
  content?: string;
  reasoning?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
  message?: {
    role: "assistant";
    content: string | null;
    annotations?: Annotation[];
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens: number;
  };
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
  supported_parameters?: string[];
}

// Получить конфигурацию из env
function getConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  
  return {
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL || "https://finapp.vercel.app",
    siteName: process.env.OPENROUTER_SITE_NAME || "Finapp AI Studio",
  };
}

// Получить заголовки для запроса
function getHeaders(config: OpenRouterConfig): Record<string, string> {
  return {
    "Authorization": `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": config.siteUrl || "",
    "X-Title": config.siteName || "",
  };
}

/**
 * Выполнить chat completion запрос (без стриминга)
 */
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const config = getConfig();
  
  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify({
      ...request,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Выполнить streaming chat completion запрос
 * Возвращает AsyncGenerator для обработки SSE чанков
 */
export async function* streamChatCompletion(
  request: ChatCompletionRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk, void, unknown> {
  const config = getConfig();
  
  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Пропускаем пустые строки и комментарии OpenRouter
        if (!trimmed || trimmed.startsWith(":")) continue;
        
        if (trimmed === "data: [DONE]") {
          return;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const json = trimmed.slice(6);
            const chunk: StreamChunk = JSON.parse(json);
            yield chunk;
          } catch {
            // Игнорируем ошибки парсинга отдельных чанков
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Получить список доступных моделей
 */
export async function getModels(): Promise<OpenRouterModel[]> {
  const config = getConfig();
  
  const response = await fetch(`${OPENROUTER_API_URL}/models`, {
    method: "GET",
    headers: getHeaders(config),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Проверить доступность API
 */
export async function checkApiKey(): Promise<boolean> {
  try {
    const config = getConfig();
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      method: "GET",
      headers: getHeaders(config),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Получить информацию о модели по ID
 */
export async function getModelInfo(modelId: string): Promise<OpenRouterModel | null> {
  try {
    const models = await getModels();
    return models.find(m => m.id === modelId) || null;
  } catch {
    return null;
  }
}

/**
 * Вспомогательная функция для создания tool declaration
 */
export function createTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>
): Tool {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters,
    },
  };
}

/**
 * Преобразовать сообщения в формат OpenRouter с изображениями
 */
export function createImageMessage(
  text: string,
  imageUrl: string,
  detail: "auto" | "low" | "high" = "auto"
): ChatMessage {
  return {
    role: "user",
    content: [
      { type: "text", text },
      {
        type: "image_url",
        image_url: { url: imageUrl, detail },
      },
    ],
  };
}
