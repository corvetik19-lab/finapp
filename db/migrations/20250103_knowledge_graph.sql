-- Migration: Knowledge Graph для KAG Lite
-- Description: Создает таблицу для хранения графа отношений между сущностями
-- Date: 2025-11-02

-- 1. Таблица для хранения графа отношений
CREATE TABLE IF NOT EXISTS knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  
  -- Исходная сущность
  entity_type text NOT NULL, -- 'transaction', 'category', 'account', 'merchant', 'pattern'
  entity_id uuid NOT NULL,
  
  -- Связанная сущность
  related_type text NOT NULL,
  related_id uuid NOT NULL,
  
  -- Тип связи
  relation_type text NOT NULL, -- 'belongs_to', 'follows', 'similar_to', 'often_with', 'same_day'
  
  -- Сила связи (0.0 - 1.0)
  strength float NOT NULL DEFAULT 0.5,
  
  -- Дополнительные метаданные
  metadata jsonb DEFAULT '{}',
  
  -- Временные метки
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Индекс для быстрого поиска
  CONSTRAINT knowledge_graph_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS knowledge_graph_user_id_idx ON knowledge_graph(user_id);
CREATE INDEX IF NOT EXISTS knowledge_graph_entity_idx ON knowledge_graph(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS knowledge_graph_related_idx ON knowledge_graph(related_type, related_id);
CREATE INDEX IF NOT EXISTS knowledge_graph_relation_idx ON knowledge_graph(relation_type);
CREATE INDEX IF NOT EXISTS knowledge_graph_strength_idx ON knowledge_graph(strength DESC);

-- 3. Составной индекс для поиска связей
CREATE INDEX IF NOT EXISTS knowledge_graph_lookup_idx 
ON knowledge_graph(user_id, entity_type, entity_id, relation_type);

-- 4. RLS политики
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own graph" ON knowledge_graph
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own graph" ON knowledge_graph
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own graph" ON knowledge_graph
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own graph" ON knowledge_graph
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Функция для получения связанных сущностей
CREATE OR REPLACE FUNCTION get_related_entities(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_relation_type text DEFAULT NULL,
  p_min_strength float DEFAULT 0.5
)
RETURNS TABLE (
  related_type text,
  related_id uuid,
  relation_type text,
  strength float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kg.related_type,
    kg.related_id,
    kg.relation_type,
    kg.strength,
    kg.metadata
  FROM knowledge_graph kg
  WHERE 
    kg.user_id = p_user_id
    AND kg.entity_type = p_entity_type
    AND kg.entity_id = p_entity_id
    AND (p_relation_type IS NULL OR kg.relation_type = p_relation_type)
    AND kg.strength >= p_min_strength
  ORDER BY kg.strength DESC;
END;
$$;

-- 6. Функция для поиска паттернов (часто встречающиеся последовательности)
CREATE OR REPLACE FUNCTION find_transaction_patterns(
  p_user_id uuid,
  p_min_occurrences int DEFAULT 3
)
RETURNS TABLE (
  pattern_description text,
  occurrences bigint,
  avg_strength float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kg.relation_type as pattern_description,
    COUNT(*) as occurrences,
    AVG(kg.strength) as avg_strength
  FROM knowledge_graph kg
  WHERE 
    kg.user_id = p_user_id
    AND kg.entity_type = 'transaction'
    AND kg.relation_type IN ('followed_by', 'often_with', 'same_day')
  GROUP BY kg.relation_type
  HAVING COUNT(*) >= p_min_occurrences
  ORDER BY occurrences DESC, avg_strength DESC;
END;
$$;

-- 7. Комментарии
COMMENT ON TABLE knowledge_graph IS 'Граф знаний для KAG Lite - хранит связи между сущностями';
COMMENT ON COLUMN knowledge_graph.entity_type IS 'Тип исходной сущности';
COMMENT ON COLUMN knowledge_graph.related_type IS 'Тип связанной сущности';
COMMENT ON COLUMN knowledge_graph.relation_type IS 'Тип связи между сущностями';
COMMENT ON COLUMN knowledge_graph.strength IS 'Сила связи от 0.0 до 1.0';
COMMENT ON FUNCTION get_related_entities IS 'Получить все связанные сущности для заданной';
COMMENT ON FUNCTION find_transaction_patterns IS 'Найти часто встречающиеся паттерны в транзакциях';
