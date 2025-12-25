/**
 * OpenRouter Embeddings для режима Финансы
 * 
 * Использует openai/text-embedding-3-large через OpenRouter API
 * Размерность: 3072 (максимальная точность для RAG)
 */

import { getOpenRouterClient, EMBEDDING_DIMENSIONS } from "./openrouter-client";
import { logger } from "@/lib/logger";

/**
 * Создаёт текстовое описание транзакции для embedding
 */
export function buildTransactionText(transaction: {
  description?: string;
  note?: string;
  counterparty?: string;
  category?: string | null;
  amount_minor: number;
  direction: "income" | "expense" | "transfer";
}): string {
  const parts: string[] = [];
  
  // Основное описание (может быть в разных полях)
  const mainText = transaction.description || transaction.note || transaction.counterparty;
  if (mainText) {
    parts.push(mainText);
  }
  
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
  
  // Сумма для контекста
  const amountMajor = Math.abs(transaction.amount_minor) / 100;
  parts.push(`сумма: ${amountMajor} руб`);
  
  return parts.join(". ");
}

/**
 * Создаёт embedding (векторное представление) для текста
 * @param text - текст для преобразования
 * @returns массив чисел (вектор размерностью 3072)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenRouterClient();
    return await client.createEmbedding(text);
  } catch (error) {
    logger.error("[OpenRouter Embeddings] Error creating embedding:", error);
    throw new Error("Failed to create embedding via OpenRouter");
  }
}

/**
 * Создаёт embeddings для нескольких текстов за один запрос (эффективнее)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const client = getOpenRouterClient();
    return await client.createEmbeddings(texts);
  } catch (error) {
    logger.error("[OpenRouter Embeddings] Error creating batch embeddings:", error);
    throw new Error("Failed to create batch embeddings via OpenRouter");
  }
}

/**
 * Получить размерность embeddings
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSIONS;
}

/**
 * Предлагает категорию для транзакции на основе описания
 * Использует LLM для классификации
 */
export async function suggestCategory(
  description: string,
  availableCategories: { id: string; name: string; type: string }[]
): Promise<{ categoryId: string; categoryName: string; confidence: number; explanation: string }> {
  try {
    const client = getOpenRouterClient();
    const categoryList = availableCategories
      .map((c) => `- ${c.name} (${c.type})`)
      .join("\n");

    const response = await client.chat([
      {
        role: "system",
        content: `Ты финансовый помощник. Определи наиболее подходящую категорию для транзакции из списка доступных категорий.

Отвечай ТОЛЬКО в формате JSON:
{
  "categoryName": "название категории",
  "confidence": 0.95,
  "explanation": "краткое объяснение"
}`
      },
      {
        role: "user",
        content: `Описание транзакции: "${description}"

Доступные категории:
${categoryList}

Выбери наиболее подходящую категорию.`
      }
    ], {
      temperature: 0.3,
      max_tokens: 256,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    // Парсим JSON из ответа
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }

    const result = JSON.parse(jsonMatch[0]);
    
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
    logger.error("[OpenRouter Embeddings] Error suggesting category:", error);
    throw new Error("Failed to suggest category");
  }
}
