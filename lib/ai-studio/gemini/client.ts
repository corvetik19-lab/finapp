import { GoogleGenAI } from "@google/genai";

// Инициализация клиента Gemini
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "",
});

export type GeminiModel = 
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-2.0-flash"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro";

export interface GenerateOptions {
  model?: GeminiModel;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  enableGrounding?: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface GenerateResult {
  text: string;
  finishReason: string;
  tokensInput: number;
  tokensOutput: number;
  groundingMetadata?: Record<string, unknown>;
}

// Простая генерация текста
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const {
    model = "gemini-2.5-flash",
    systemPrompt,
    maxTokens = 8192,
    temperature = 0.7,
  } = options;

  const contents = systemPrompt 
    ? [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Понял, буду следовать инструкциям." }] },
        { role: "user" as const, parts: [{ text: prompt }] },
      ]
    : [{ role: "user" as const, parts: [{ text: prompt }] }];

  const response = await genAI.models.generateContent({
    model,
    contents,
    config: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const text = response.text || "";
  const usage = response.usageMetadata;

  return {
    text,
    finishReason: response.candidates?.[0]?.finishReason || "STOP",
    tokensInput: usage?.promptTokenCount || 0,
    tokensOutput: usage?.candidatesTokenCount || 0,
  };
}

// Генерация с историей чата
export async function generateChatResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const {
    model = "gemini-2.5-flash",
    systemPrompt,
    maxTokens = 8192,
    temperature = 0.7,
    enableGrounding = false,
  } = options;

  // Преобразуем сообщения в формат Gemini
  const contents = messages.map(msg => ({
    role: msg.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: msg.content }],
  }));

  // Добавляем системный промпт в начало
  if (systemPrompt) {
    contents.unshift(
      { role: "user" as const, parts: [{ text: `Системные инструкции:\n${systemPrompt}` }] },
      { role: "model" as const, parts: [{ text: "Понял, следую инструкциям." }] }
    );
  }

  const config: Record<string, unknown> = {
    maxOutputTokens: maxTokens,
    temperature,
  };

  // Google Search Grounding
  if (enableGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await genAI.models.generateContent({
    model,
    contents,
    config,
  });

  const text = response.text || "";
  const usage = response.usageMetadata;

  return {
    text,
    finishReason: response.candidates?.[0]?.finishReason || "STOP",
    tokensInput: usage?.promptTokenCount || 0,
    tokensOutput: usage?.candidatesTokenCount || 0,
    groundingMetadata: response.candidates?.[0]?.groundingMetadata as Record<string, unknown> | undefined,
  };
}

// Streaming генерация
export async function* streamChatResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): AsyncGenerator<string, GenerateResult, unknown> {
  const {
    model = "gemini-2.5-flash",
    systemPrompt,
    maxTokens = 8192,
    temperature = 0.7,
  } = options;

  const contents = messages.map(msg => ({
    role: msg.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: msg.content }],
  }));

  if (systemPrompt) {
    contents.unshift(
      { role: "user" as const, parts: [{ text: `Системные инструкции:\n${systemPrompt}` }] },
      { role: "model" as const, parts: [{ text: "Понял, следую инструкциям." }] }
    );
  }

  const response = await genAI.models.generateContentStream({
    model,
    contents,
    config: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  let fullText = "";
  let tokensInput = 0;
  let tokensOutput = 0;
  let finishReason = "STOP";

  for await (const chunk of response) {
    const text = chunk.text || "";
    fullText += text;
    
    if (chunk.usageMetadata) {
      tokensInput = chunk.usageMetadata.promptTokenCount || 0;
      tokensOutput = chunk.usageMetadata.candidatesTokenCount || 0;
    }

    if (chunk.candidates?.[0]?.finishReason) {
      finishReason = chunk.candidates[0].finishReason;
    }

    yield text;
  }

  return {
    text: fullText,
    finishReason,
    tokensInput,
    tokensOutput,
  };
}

// Экспорт клиента для расширенного использования
export { genAI };
