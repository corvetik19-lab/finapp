-- Migration: Add embeddings support for RAG
-- Description: Adds vector column for transaction embeddings and search functions
-- Date: 2025-11-02

-- 1. Убедимся что расширение pgvector включено
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Добавляем колонку для хранения embeddings (OpenAI text-embedding-3-small = 1536 dimensions)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Создаем индекс HNSW для быстрого векторного поиска
-- HNSW (Hierarchical Navigable Small World) - оптимален для similarity search
CREATE INDEX IF NOT EXISTS transactions_embedding_idx 
ON transactions 
USING hnsw (embedding vector_cosine_ops);

-- 4. Функция для поиска похожих транзакций по embedding
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  note text,
  amount_minor bigint,
  currency text,
  occurred_at timestamptz,
  category_id uuid,
  account_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.note,
    t.amount_minor,
    t.currency,
    t.occurred_at,
    t.category_id,
    t.account_id,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transactions t
  WHERE 
    t.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR t.user_id = filter_user_id)
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Функция для получения статистики по embeddings
CREATE OR REPLACE FUNCTION get_embedding_stats(filter_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_transactions bigint,
  with_embeddings bigint,
  without_embeddings bigint,
  coverage_percent numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_transactions,
    COUNT(embedding) as with_embeddings,
    COUNT(*) - COUNT(embedding) as without_embeddings,
    ROUND((COUNT(embedding)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as coverage_percent
  FROM transactions
  WHERE filter_user_id IS NULL OR user_id = filter_user_id;
END;
$$;

-- 6. Комментарии для документации
COMMENT ON COLUMN transactions.embedding IS 'Vector embedding for semantic search (OpenAI text-embedding-3-small, 1536 dimensions)';
COMMENT ON FUNCTION match_transactions IS 'Find similar transactions using cosine similarity search';
COMMENT ON FUNCTION get_embedding_stats IS 'Get statistics about embedding coverage';

-- 7. Индекс для фильтрации по user_id в комбинации с embedding
CREATE INDEX IF NOT EXISTS transactions_user_embedding_idx 
ON transactions(user_id) 
WHERE embedding IS NOT NULL;
