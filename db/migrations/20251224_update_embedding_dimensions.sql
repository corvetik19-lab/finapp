-- Миграция для обновления размерности embeddings с 1536 на 3072
-- Требуется для использования OpenAI text-embedding-3-large

-- 1. Удаляем старые embeddings (они несовместимы с новой размерностью)
UPDATE transactions SET embedding = NULL WHERE embedding IS NOT NULL;

-- 2. Меняем размерность колонки
ALTER TABLE transactions 
ALTER COLUMN embedding TYPE vector(3072);

-- 3. Пересоздаём индекс с новой размерностью
DROP INDEX IF EXISTS transactions_embedding_idx;
CREATE INDEX transactions_embedding_idx ON transactions 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- 4. Обновляем функции для работы с 3072 dimensions

-- match_transactions
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(3072),
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
    t.amount,
    t.currency,
    t.occurred_at,
    t.category_id,
    t.account_id,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transactions t
  WHERE 
    (filter_user_id IS NULL OR t.user_id = filter_user_id)
    AND t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- search_transactions_by_embedding
CREATE OR REPLACE FUNCTION search_transactions_by_embedding(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  note text,
  amount bigint,
  direction text,
  occurred_at timestamptz,
  category_id uuid,
  category_name text,
  account_id uuid,
  account_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.note,
    t.amount,
    t.direction::text,
    t.occurred_at,
    t.category_id,
    c.name as category_name,
    t.account_id,
    a.name as account_name,
    (1 - (t.embedding <=> query_embedding))::float as similarity
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts a ON t.account_id = a.id
  WHERE 
    t.embedding IS NOT NULL
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (1 - (t.embedding <=> query_embedding)) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- suggest_category_from_similar
CREATE OR REPLACE FUNCTION suggest_category_from_similar(
  query_embedding vector(3072),
  p_user_id uuid,
  top_n int DEFAULT 5
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  match_count bigint,
  avg_similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH similar_transactions AS (
    SELECT 
      t.category_id,
      (1 - (t.embedding <=> query_embedding))::float as similarity
    FROM transactions t
    WHERE 
      t.embedding IS NOT NULL
      AND t.user_id = p_user_id
      AND t.category_id IS NOT NULL
    ORDER BY t.embedding <=> query_embedding
    LIMIT 20
  )
  SELECT 
    st.category_id,
    c.name as category_name,
    COUNT(*)::bigint as match_count,
    AVG(st.similarity)::float as avg_similarity
  FROM similar_transactions st
  JOIN categories c ON st.category_id = c.id
  GROUP BY st.category_id, c.name
  ORDER BY match_count DESC, avg_similarity DESC
  LIMIT top_n;
END;
$$;

COMMENT ON FUNCTION match_transactions IS 'Search for similar transactions using vector embeddings (3072 dimensions for text-embedding-3-large)';
