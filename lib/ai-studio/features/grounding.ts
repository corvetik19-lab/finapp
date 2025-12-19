"use server";

import { getGeminiClient } from "@/lib/ai/gemini-client";

export interface GroundingSource {
  title: string;
  url: string;
  snippet: string;
}

export interface GroundedResponse {
  text: string;
  sources: GroundingSource[];
}

// Поиск с Google Search Grounding
export async function searchWithGrounding(
  query: string,
  systemPrompt?: string
): Promise<GroundedResponse | { error: string }> {
  try {
    const client = getGeminiClient();
    
    // Добавляем системный промпт к запросу если он есть
    const fullQuery = systemPrompt ? `${systemPrompt}\n\n${query}` : query;
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ text: fullQuery }],
      }],
      config: {
        tools: [{
          googleSearch: {},
        }],
      },
    });

    const text = response.text || "";
    
    // Извлекаем источники из grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: GroundingSource[] = [];
    
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Источник",
            url: chunk.web.uri || "",
            snippet: "",
          });
        }
      }
    }

    return { text, sources };
  } catch (error) {
    console.error("Grounding search error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Анализ URL контекста
export async function analyzeUrl(
  url: string,
  question?: string
): Promise<{ summary: string; content?: string } | { error: string }> {
  try {
    const client = getGeminiClient();
    
    const prompt = question 
      ? `Проанализируй содержимое по этой ссылке: ${url}\n\nОтветь на вопрос: ${question}`
      : `Проанализируй и кратко опиши содержимое по этой ссылке: ${url}`;
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
      config: {
        tools: [{
          googleSearch: {},
        }],
      },
    });

    return { summary: response.text || "" };
  } catch (error) {
    console.error("URL analysis error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
