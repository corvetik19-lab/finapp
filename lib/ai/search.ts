/**
 * Семантический поиск транзакций через pgvector
 */

import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export type SearchResult = {
  id: string;
  description: string;
  amount_minor: number;
  direction: "income" | "expense" | "transfer";
  category_id: string | null;
  transaction_date: string;
  similarity: number; // 0-1, где 1 = полное совпадение
  category?: {
    name: string;
    type: string;
  };
};

/**
 * Семантический поиск похожих транзакций по embedding вектору
 * @param embedding - вектор запроса (1536 чисел)
 * @param limit - количество результатов
 * @param threshold - минимальная схожесть (0-1)
 */
export async function searchSimilarTransactions(
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
): Promise<SearchResult[]> {
  const supabase = await createRSCClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Используем оператор <-> для косинусного расстояния в pgvector
  // Чем меньше расстояние, тем больше схожесть
  // similarity = 1 - distance
  const { data, error } = await supabase.rpc("search_transactions_by_embedding", {
    query_embedding: embedding,
    match_threshold: 1 - threshold, // Конвертируем в distance
    match_count: limit,
    p_user_id: user.id,
  });

  if (error) {
    logger.error("Error searching transactions:", error);
    throw new Error("Failed to search transactions");
  }

  return data || [];
}

/**
 * Находит похожие транзакции на указанную
 * @param transactionId - ID транзакции для поиска похожих
 * @param limit - количество результатов
 */
export async function findSimilarToTransaction(
  transactionId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const supabase = await createRSCClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Получаем embedding исходной транзакции
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("embedding")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !transaction?.embedding) {
    throw new Error("Transaction not found or has no embedding");
  }

  // Ищем похожие, исключая саму транзакцию
  const { data, error } = await supabase.rpc("search_transactions_by_embedding", {
    query_embedding: transaction.embedding,
    match_threshold: 0.3, // Более низкий порог для "похожих"
    match_count: limit + 1, // +1 чтобы исключить саму транзакцию
    p_user_id: user.id,
  });

  if (error) {
    logger.error("Error finding similar transactions:", error);
    throw new Error("Failed to find similar transactions");
  }

  // Фильтруем саму транзакцию и берём нужное количество
  return (data || [])
    .filter((t: SearchResult) => t.id !== transactionId)
    .slice(0, limit);
}

/**
 * Обновляет embedding для транзакции
 */
export async function updateTransactionEmbedding(
  transactionId: string,
  embedding: number[]
): Promise<void> {
  const supabase = await createRSCClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("transactions")
    .update({ embedding })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Error updating embedding:", error);
    throw new Error("Failed to update embedding");
  }
}

/**
 * Создаёт embeddings для всех транзакций пользователя без них
 * Используется для массового обновления
 */
export async function generateMissingEmbeddings(): Promise<{ processed: number; errors: number }> {
  const supabase = await createRSCClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Находим транзакции без embeddings
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      id, 
      description, 
      amount_minor, 
      direction, 
      category:categories(name, type)
    `)
    .eq("user_id", user.id)
    .is("embedding", null)
    .limit(100); // Обрабатываем порциями

  if (error || !transactions) {
    throw new Error("Failed to fetch transactions");
  }

  let processed = 0;
  let errors = 0;

  // Обрабатываем каждую транзакцию
  // В production лучше делать батчами через createEmbeddings()
  for (const transaction of transactions) {
    try {
      const { createEmbedding, buildTransactionText } = await import("./embeddings");
      
      // category может быть массивом из-за Supabase join
      type CategoryJoinResult = { name?: string } | { name?: string }[] | null;
      const category = transaction.category as CategoryJoinResult;
      const categoryName = Array.isArray(category)
        ? category[0]?.name
        : category?.name;
      
      const text = buildTransactionText({
        description: transaction.description,
        category: categoryName || null,
        amount_minor: transaction.amount_minor,
        direction: transaction.direction,
      });

      const embedding = await createEmbedding(text);
      await updateTransactionEmbedding(transaction.id, embedding);
      
      processed++;
    } catch (err) {
      logger.error(`Error processing transaction ${transaction.id}:`, err);
      errors++;
    }
  }

  return { processed, errors };
}
