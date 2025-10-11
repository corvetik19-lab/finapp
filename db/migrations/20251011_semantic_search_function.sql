-- Функция для семантического поиска транзакций через pgvector
-- Использует косинусное расстояние для поиска похожих векторов

CREATE OR REPLACE FUNCTION search_transactions_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  description text,
  amount_minor bigint,
  direction text,
  category_id uuid,
  transaction_date timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.description,
    t.amount_minor,
    t.direction::text,
    t.category_id,
    t.transaction_date,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transactions t
  WHERE 
    t.user_id = p_user_id
    AND t.embedding IS NOT NULL
    AND (t.embedding <=> query_embedding) < match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION search_transactions_by_embedding IS 
'Семантический поиск транзакций по embedding вектору. 
Возвращает транзакции, отсортированные по схожести (similarity от 0 до 1).
Оператор <=> вычисляет косинусное расстояние между векторами.';

-- Функция для поиска похожих транзакций по категориям
-- Помогает AI предлагать категории на основе похожих транзакций

CREATE OR REPLACE FUNCTION suggest_category_from_similar(
  query_embedding vector(1536),
  p_user_id uuid,
  top_n int DEFAULT 5
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  frequency bigint,
  avg_similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.category_id,
    c.name as category_name,
    COUNT(*)::bigint as frequency,
    AVG(1 - (t.embedding <=> query_embedding))::float as avg_similarity
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  WHERE 
    t.user_id = p_user_id
    AND t.embedding IS NOT NULL
    AND t.category_id IS NOT NULL
    AND (t.embedding <=> query_embedding) < 0.3
  GROUP BY t.category_id, c.name
  ORDER BY frequency DESC, avg_similarity DESC
  LIMIT top_n;
END;
$$;

COMMENT ON FUNCTION suggest_category_from_similar IS
'Предлагает категорию на основе похожих транзакций.
Группирует результаты по категориям и возвращает самые частые.';

-- Создаём индекс для ускорения поиска по embeddings
-- Используем ivfflat индекс для больших объёмов данных

CREATE INDEX IF NOT EXISTS idx_transactions_embedding ON transactions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Комментарий об индексе
COMMENT ON INDEX idx_transactions_embedding IS
'IVFFlat индекс для быстрого поиска по косинусному расстоянию.
lists = 100 подходит для ~10,000 транзакций.
Для больших объёмов можно увеличить до sqrt(n_rows).';
