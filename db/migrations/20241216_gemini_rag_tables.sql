-- ============================================
-- Миграция: Gemini RAG и Graph-RAG таблицы
-- Дата: 2024-12-16
-- Описание: Таблицы для хранения документов, 
--           чанков с embeddings и графа знаний
-- ============================================

-- Включаем расширение pgvector если не включено
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. DOCUMENTS - Документы для RAG
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Метаданные документа
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Тип и модуль
  doc_type TEXT, -- 'tender', 'contract', 'invoice', 'receipt', 'report', 'other'
  module TEXT NOT NULL DEFAULT 'general', -- 'tenders', 'finance', 'suppliers', 'personal'
  
  -- Связи с сущностями
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  
  -- Статус обработки
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  processing_error TEXT,
  chunks_count INT DEFAULT 0,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы для documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_tender_id ON documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(module);

-- RLS для documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_user_policy ON documents
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 2. DOCUMENT_CHUNKS - Чанки документов с embeddings
-- ============================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Содержимое чанка
  chunk_index INT NOT NULL,
  text_content TEXT NOT NULL,
  char_start INT,
  char_end INT,
  
  -- Embedding (768 dimensions для Gemini)
  embedding vector(768),
  
  -- Метаданные чанка
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);

-- Индекс для векторного поиска (IVFFlat для производительности)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
  ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS для document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_chunks_user_policy ON document_chunks
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 3. ENTITIES - Сущности для Graph-RAG
-- ============================================
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип и идентификация сущности
  entity_type TEXT NOT NULL, -- 'supplier', 'certificate', 'gost', 'requirement', 'product', 'person', 'organization'
  name TEXT NOT NULL,
  normalized_name TEXT, -- Нормализованное имя для поиска дубликатов
  
  -- Внешние ссылки
  external_id TEXT, -- ИНН, ОГРН, номер сертификата и т.д.
  external_source TEXT, -- Источник данных
  
  -- Данные сущности
  data JSONB DEFAULT '{}',
  
  -- Качество данных
  confidence FLOAT DEFAULT 1.0, -- 0.0 - 1.0
  verified BOOLEAN DEFAULT FALSE,
  
  -- Embedding для семантического поиска
  embedding vector(768),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы для entities
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON entities(user_id);
CREATE INDEX IF NOT EXISTS idx_entities_company_id ON entities(company_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_normalized_name ON entities(normalized_name);
CREATE INDEX IF NOT EXISTS idx_entities_external_id ON entities(external_id);

-- Индекс для векторного поиска сущностей
CREATE INDEX IF NOT EXISTS idx_entities_embedding 
  ON entities 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS для entities
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY entities_user_policy ON entities
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 4. RELATIONS - Связи между сущностями
-- ============================================
CREATE TABLE IF NOT EXISTS relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Связь между сущностями
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  -- Тип связи
  rel_type TEXT NOT NULL, -- 'HAS_CERT', 'REQUIRES_CERT', 'SUPPLIES', 'WORKS_FOR', 'VIOLATES', 'PARTICIPATES'
  
  -- Данные связи
  data JSONB DEFAULT '{}',
  
  -- Качество данных
  confidence FLOAT DEFAULT 1.0,
  
  -- Источник связи
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для relations
CREATE INDEX IF NOT EXISTS idx_relations_user_id ON relations(user_id);
CREATE INDEX IF NOT EXISTS idx_relations_from_entity ON relations(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_entity ON relations(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(rel_type);

-- RLS для relations
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY relations_user_policy ON relations
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 5. AI_SUMMARIES - AI саммари документов
-- ============================================
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Связь с документом или тендером
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  
  -- Тип саммари
  summary_type TEXT NOT NULL, -- 'document', 'tender_requirements', 'compliance_check', 'risk_analysis'
  
  -- Содержимое
  title TEXT,
  content TEXT NOT NULL,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  model_used TEXT, -- Какая модель использовалась
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для ai_summaries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_id ON ai_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_document_id ON ai_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_tender_id ON ai_summaries(tender_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_type ON ai_summaries(summary_type);

-- RLS для ai_summaries
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_summaries_user_policy ON ai_summaries
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 6. ФУНКЦИИ ДЛЯ ПОИСКА
-- ============================================

-- Функция поиска по чанкам документов
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_document_id UUID DEFAULT NULL,
  filter_module TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INT,
  text_content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.text_content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE 
    dc.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR dc.user_id = filter_user_id)
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (filter_module IS NULL OR d.module = filter_module)
    AND d.deleted_at IS NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Функция поиска сущностей
CREATE OR REPLACE FUNCTION match_entities(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  name TEXT,
  data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.entity_type,
    e.name,
    e.data,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM entities e
  WHERE 
    e.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_entity_type IS NULL OR e.entity_type = filter_entity_type)
    AND e.deleted_at IS NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Функция получения связей сущности
CREATE OR REPLACE FUNCTION get_entity_relations(
  entity_id UUID,
  filter_user_id UUID DEFAULT NULL,
  max_depth INT DEFAULT 2
)
RETURNS TABLE (
  from_id UUID,
  from_name TEXT,
  from_type TEXT,
  rel_type TEXT,
  to_id UUID,
  to_name TEXT,
  to_type TEXT,
  depth INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE graph AS (
    -- Начальный уровень
    SELECT 
      r.from_entity_id,
      e1.name AS from_name,
      e1.entity_type AS from_type,
      r.rel_type,
      r.to_entity_id,
      e2.name AS to_name,
      e2.entity_type AS to_type,
      1 AS depth
    FROM relations r
    JOIN entities e1 ON e1.id = r.from_entity_id
    JOIN entities e2 ON e2.id = r.to_entity_id
    WHERE 
      (r.from_entity_id = entity_id OR r.to_entity_id = entity_id)
      AND (filter_user_id IS NULL OR r.user_id = filter_user_id)
    
    UNION
    
    -- Рекурсивный уровень
    SELECT 
      r.from_entity_id,
      e1.name,
      e1.entity_type,
      r.rel_type,
      r.to_entity_id,
      e2.name,
      e2.entity_type,
      g.depth + 1
    FROM relations r
    JOIN entities e1 ON e1.id = r.from_entity_id
    JOIN entities e2 ON e2.id = r.to_entity_id
    JOIN graph g ON (r.from_entity_id = g.to_id OR r.to_entity_id = g.from_id)
    WHERE 
      g.depth < max_depth
      AND (filter_user_id IS NULL OR r.user_id = filter_user_id)
  )
  SELECT DISTINCT 
    graph.from_entity_id,
    graph.from_name,
    graph.from_type,
    graph.rel_type,
    graph.to_entity_id,
    graph.to_name,
    graph.to_type,
    graph.depth
  FROM graph
  ORDER BY graph.depth;
END;
$$;

-- ============================================
-- 7. ТРИГГЕРЫ
-- ============================================

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER relations_updated_at
  BEFORE UPDATE ON relations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ai_summaries_updated_at
  BEFORE UPDATE ON ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ГОТОВО!
-- ============================================
COMMENT ON TABLE documents IS 'Документы для RAG (тендерные, финансовые, и т.д.)';
COMMENT ON TABLE document_chunks IS 'Чанки документов с Gemini embeddings (768d)';
COMMENT ON TABLE entities IS 'Сущности для Graph-RAG (поставщики, сертификаты, ГОСТы)';
COMMENT ON TABLE relations IS 'Связи между сущностями в графе знаний';
COMMENT ON TABLE ai_summaries IS 'AI саммари и анализы документов';
