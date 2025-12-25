"use server";

import { getOpenRouterClient } from "@/lib/ai/openrouter-client";

export interface GroundingSource {
  title: string;
  url: string;
  snippet: string;
}

export interface GroundedResponse {
  text: string;
  sources: GroundingSource[];
}

// Поиск через OpenRouter (без Google Search Grounding)
export async function searchWithGrounding(
  query: string,
  systemPrompt?: string
): Promise<GroundedResponse | { error: string }> {
  try {
    const client = getOpenRouterClient();
    
    const fullQuery = systemPrompt 
      ? `${systemPrompt}\n\n${query}` 
      : query;
    
    const response = await client.chat([
      { role: "user", content: fullQuery }
    ], {
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || "";
    
    // OpenRouter не предоставляет источники автоматически
    const sources: GroundingSource[] = [];

    return { text, sources };
  } catch (error) {
    console.error("Search error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Анализ URL контекста через OpenRouter
export async function analyzeUrl(
  url: string,
  question?: string
): Promise<{ summary: string; content?: string } | { error: string }> {
  try {
    const client = getOpenRouterClient();
    
    const prompt = question 
      ? `Проанализируй содержимое по этой ссылке: ${url}\n\nОтветь на вопрос: ${question}`
      : `Проанализируй и кратко опиши содержимое по этой ссылке: ${url}`;
    
    const response = await client.chat([
      { role: "user", content: prompt }
    ], {
      temperature: 0.7,
      max_tokens: 4096,
    });

    return { summary: response.choices[0]?.message?.content || "" };
  } catch (error) {
    console.error("URL analysis error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
