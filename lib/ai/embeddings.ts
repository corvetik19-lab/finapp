/**
 * Google Gemini Embeddings для семантического поиска (RAG)
 * Используем Gemini API с моделью gemini-embedding-001
 */

import { getGeminiClient, getEmbeddingsModel, getEmbeddingDimension } from "./gemini-client";
import { logger } from "@/lib/logger";

/**
 * Создаёт текстовое описание транзакции для embedding
 */
export function buildTransactionText(transaction: {
  description: string;
  category?: string | null;
  amount_minor: number;
  direction: "income" | "expense" | "transfer";
}): string {
  const parts: string[] = [];
  
  // Основное описание
  parts.push(transaction.description);
  
  // Категория (если есть)
  if (transaction.category) {
    parts.push(`категория: ${transaction.category}`);
  }
  
  // Тип операции
  const typeMap = {
    income: "доход",
    expense: "расход",
    transfer: "перевод",
  };
  parts.push(`тип: ${typeMap[transaction.direction]}`);
  
  return parts.join(". ");
}

/**
 * Создаёт embedding (векторное представление) для текста
 * @param text - текст для преобразования
 * @returns массив чисел (вектор размерностью 768)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const client = getGeminiClient();
    const response = await client.models.embedContent({
      model: getEmbeddingsModel(),
      contents: text,
      config: { outputDimensionality: getEmbeddingDimension() },
    });

    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    logger.error("Error creating embedding:", error);
    throw new Error("Failed to create embedding");
  }
}

/**
 * Создаёт embeddings для нескольких текстов за один запрос (эффективнее)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    // Gemini поддерживает batch embeddings
    const results: number[][] = [];
    const client = getGeminiClient();
    
    // Обрабатываем по одному (Gemini embedContent не поддерживает batch напрямую)
    for (const text of texts) {
      const response = await client.models.embedContent({
        model: getEmbeddingsModel(),
        contents: text,
        config: { outputDimensionality: getEmbeddingDimension() },
      });
      results.push(response.embeddings?.[0]?.values || []);
    }
    
    return results;
  } catch (error) {
    logger.error("Error creating embeddings:", error);
    throw new Error("Failed to create embeddings");
  }
}

/**
 * Предлагает категорию для транзакции на основе описания
 */
export async function suggestCategory(
  description: string,
  availableCategories: { id: string; name: string; type: string }[]
): Promise<{ categoryId: string; categoryName: string; confidence: number; explanation: string }> {
  try {
    const client = getGeminiClient();
    const categoryList = availableCategories
      .map((c) => `- ${c.name} (${c.type})`)
      .join("\n");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Ты финансовый помощник. Определи наиболее подходящую категорию для транзакции из списка доступных категорий.

Описание транзакции: "${description}"

Доступные категории:
${categoryList}

Выбери наиболее подходящую категорию. Отвечай ТОЛЬКО в формате JSON:
{
  "categoryName": "название категории",
  "confidence": 0.95,
  "explanation": "краткое объяснение"
}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Находим ID категории по названию
    const category = availableCategories.find(
      (c) => c.name.toLowerCase() === result.categoryName?.toLowerCase()
    );

    if (!category) {
      throw new Error("Category not found in available list");
    }

    return {
      categoryId: category.id,
      categoryName: category.name,
      confidence: result.confidence || 0.5,
      explanation: result.explanation || "Автоматически определено AI",
    };
  } catch (error) {
    logger.error("Error suggesting category:", error);
    throw new Error("Failed to suggest category");
  }
}
