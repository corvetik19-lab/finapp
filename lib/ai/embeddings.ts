/**
 * OpenAI Embeddings для семантического поиска транзакций (RAG)
 * Используем OpenAI API с моделью text-embedding-3-small
 */

import OpenAI from "openai";
import { getEmbeddingsModel } from "./openai-client";

// Функция для получения клиента OpenAI (ленивая инициализация)
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "dummy-key-for-build") {
    throw new Error("OPENAI_API_KEY not configured");
  }
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false,
  });
}

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
 * @returns массив чисел (вектор размерностью 1536)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: getEmbeddingsModel(),
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    throw new Error("Failed to create embedding");
  }
}

/**
 * Создаёт embeddings для нескольких текстов за один запрос (эффективнее)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: getEmbeddingsModel(),
      input: texts,
      encoding_format: "float",
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Error creating embeddings:", error);
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
    const openai = getOpenAIClient();
    const categoryList = availableCategories
      .map((c) => `- ${c.name} (${c.type})`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты финансовый помощник. Определи наиболее подходящую категорию для транзакции из списка доступных категорий. Отвечай ТОЛЬКО в формате JSON:
{
  "categoryName": "название категории",
  "confidence": 0.95,
  "explanation": "краткое объяснение"
}`,
        },
        {
          role: "user",
          content: `Описание транзакции: "${description}"

Доступные категории:
${categoryList}

Выбери наиболее подходящую категорию.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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
    console.error("Error suggesting category:", error);
    throw new Error("Failed to suggest category");
  }
}
