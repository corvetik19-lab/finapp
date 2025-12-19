/**
 * Умная автокатегоризация с использованием embeddings
 * Комбинирует семантический поиск похожих транзакций и GPT для точной категоризации
 */

import { createEmbedding } from "./embeddings";
import { createRouteClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface Transaction {
  id: string;
  note: string;
  category_id: string | null;
  embedding: number[] | null;
  similarity?: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  explanation: string;
  similarTransactions?: Array<{
    note: string;
    category: string;
    similarity: number;
  }>;
}

/**
 * Улучшенная автокатегоризация с использованием embeddings
 * 
 * Алгоритм:
 * 1. Создаём embedding для описания новой транзакции
 * 2. Ищем похожие транзакции через векторный поиск (pgvector)
 * 3. Анализируем категории похожих транзакций
 * 4. Если есть явный паттерн (>70% похожих в одной категории) - возвращаем её
 * 5. Иначе - используем GPT для финального решения с контекстом похожих
 */
export async function smartCategorizeTransaction(
  description: string,
  userId: string,
  availableCategories: Category[],
  threshold: number = 0.75 // Минимальное сходство для учёта транзакции
): Promise<CategorizationResult> {
  try {
    const supabase = await createRouteClient();
    
    // 1. Создаём embedding для описания
    const queryEmbedding = await createEmbedding(description);
    
    // 2. Ищем похожие транзакции через pgvector
    const { data: similarTransactions, error } = await supabase.rpc(
      'match_transactions',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 10,
        filter_user_id: userId,
      }
    );
    
    if (error) {
      logger.error('Error searching similar transactions:', error);
      // Fallback на простую категоризацию без embeddings
      return fallbackCategorization(description, availableCategories);
    }
    
    // 3. Анализируем категории похожих транзакций
    const categoryCounts = new Map<string, { count: number; name: string; avgSimilarity: number }>();
    
    if (similarTransactions && similarTransactions.length > 0) {
      for (const txn of similarTransactions) {
        if (!txn.category_id) continue;
        
        const category = availableCategories.find(c => c.id === txn.category_id);
        if (!category) continue;
        
        const current = categoryCounts.get(txn.category_id) || {
          count: 0,
          name: category.name,
          avgSimilarity: 0,
        };
        
        current.count++;
        current.avgSimilarity = (current.avgSimilarity * (current.count - 1) + txn.similarity) / current.count;
        
        categoryCounts.set(txn.category_id, current);
      }
      
      // 4. Проверяем, есть ли явный паттерн
      const totalWithCategory = Array.from(categoryCounts.values()).reduce((sum, c) => sum + c.count, 0);
      
      if (totalWithCategory > 0) {
        // Сортируем по количеству и средней схожести
        const sortedCategories = Array.from(categoryCounts.entries())
          .sort((a, b) => {
            // Сначала по количеству, потом по схожести
            if (b[1].count !== a[1].count) {
              return b[1].count - a[1].count;
            }
            return b[1].avgSimilarity - a[1].avgSimilarity;
          });
        
        const topCategory = sortedCategories[0];
        const percentage = (topCategory[1].count / totalWithCategory) * 100;
        
        // Если >70% похожих транзакций в одной категории - используем её
        if (percentage > 70 && topCategory[1].avgSimilarity > 0.8) {
          return {
            categoryId: topCategory[0],
            categoryName: topCategory[1].name,
            confidence: Math.min(0.95, topCategory[1].avgSimilarity),
            explanation: `Найдено ${topCategory[1].count} похожих транзакций в категории "${topCategory[1].name}" (${percentage.toFixed(0)}% совпадений, средняя схожесть ${(topCategory[1].avgSimilarity * 100).toFixed(0)}%)`,
            similarTransactions: similarTransactions.slice(0, 3).map((t: Transaction) => ({
              note: t.note || 'Без описания',
              category: availableCategories.find(c => c.id === t.category_id)?.name || 'Неизвестно',
              similarity: t.similarity || 0,
            })),
          };
        }
      }
    }
    
    // 5. Используем GPT с контекстом похожих транзакций
    return await gptCategorizeWithContext(
      description,
      availableCategories,
      similarTransactions || []
    );
    
  } catch (error) {
    logger.error('Error in smart categorization:', error);
    return fallbackCategorization(description, availableCategories);
  }
}

/**
 * GPT категоризация с контекстом похожих транзакций
 */
async function gptCategorizeWithContext(
  description: string,
  availableCategories: Category[],
  similarTransactions: Transaction[]
): Promise<CategorizationResult> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const categoryList = availableCategories
    .map((c) => `- ${c.name} (${c.type})`)
    .join('\n');
  
  const similarContext = similarTransactions.length > 0
    ? `\n\nПохожие транзакции из истории:\n${similarTransactions
        .slice(0, 5)
        .map((t, i) => {
          const cat = availableCategories.find(c => c.id === t.category_id);
          return `${i + 1}. "${t.note}" → ${cat?.name || 'Без категории'} (схожесть: ${((t.similarity || 0) * 100).toFixed(0)}%)`;
        })
        .join('\n')}`
    : '';
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Ты финансовый помощник. Определи наиболее подходящую категорию для транзакции из списка доступных категорий. 
        
Учитывай похожие транзакции из истории пользователя для более точного определения.

Отвечай ТОЛЬКО в формате JSON:
{
  "categoryName": "название категории",
  "confidence": 0.95,
  "explanation": "краткое объяснение"
}`,
      },
      {
        role: 'user',
        content: `Описание транзакции: "${description}"

Доступные категории:
${categoryList}${similarContext}

Выбери наиболее подходящую категорию.`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  
  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  // Находим ID категории по названию
  const category = availableCategories.find(
    (c) => c.name.toLowerCase() === result.categoryName?.toLowerCase()
  );
  
  if (!category) {
    throw new Error('Category not found in available list');
  }
  
  return {
    categoryId: category.id,
    categoryName: category.name,
    confidence: result.confidence || 0.7,
    explanation: result.explanation || 'Определено AI с учётом похожих транзакций',
    similarTransactions: similarTransactions.slice(0, 3).map((t: Transaction) => ({
      note: t.note || 'Без описания',
      category: availableCategories.find(c => c.id === t.category_id)?.name || 'Неизвестно',
      similarity: t.similarity || 0,
    })),
  };
}

/**
 * Fallback категоризация без embeddings (простой GPT)
 */
async function fallbackCategorization(
  description: string,
  availableCategories: Category[]
): Promise<CategorizationResult> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const categoryList = availableCategories
    .map((c) => `- ${c.name} (${c.type})`)
    .join('\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Ты финансовый помощник. Определи наиболее подходящую категорию для транзакции. Отвечай ТОЛЬКО в формате JSON:
{
  "categoryName": "название категории",
  "confidence": 0.95,
  "explanation": "краткое объяснение"
}`,
      },
      {
        role: 'user',
        content: `Описание транзакции: "${description}"

Доступные категории:
${categoryList}

Выбери наиболее подходящую категорию.`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  
  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  const category = availableCategories.find(
    (c) => c.name.toLowerCase() === result.categoryName?.toLowerCase()
  );
  
  if (!category) {
    throw new Error('Category not found in available list');
  }
  
  return {
    categoryId: category.id,
    categoryName: category.name,
    confidence: result.confidence || 0.5,
    explanation: result.explanation || 'Автоматически определено AI',
  };
}
