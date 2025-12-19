-- AI Studio: Таблицы для ассистентов, чатов и сообщений
-- Миграция: 0155_ai_studio_tables.sql

-- ============================================================
-- Таблица: ai_assistants (Ассистенты GPTs)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  avatar_url TEXT,
  emoji VARCHAR(10),
  
  model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  color VARCHAR(20) DEFAULT '#ff6b35',
  
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_assistants_user_id ON ai_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistants_company_id ON ai_assistants(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistants_is_public ON ai_assistants(is_public) WHERE is_public = true;

-- RLS
ALTER TABLE ai_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and public assistants"
  ON ai_assistants FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert own assistants"
  ON ai_assistants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own assistants"
  ON ai_assistants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own assistants"
  ON ai_assistants FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- Таблица: ai_assistant_favorites (Избранные ассистенты)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_assistant_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES ai_assistants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, assistant_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_assistant_favorites_user_id ON ai_assistant_favorites(user_id);

-- RLS
ALTER TABLE ai_assistant_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON ai_assistant_favorites FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Таблица: ai_chats (Чаты)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES ai_assistants(id) ON DELETE SET NULL,
  
  title VARCHAR(200),
  model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  
  -- Настройки чата
  settings JSONB DEFAULT '{}',
  
  -- Статистика
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_company_id ON ai_chats(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_assistant_id ON ai_chats(assistant_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_created_at ON ai_chats(created_at DESC);

-- RLS
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats"
  ON ai_chats FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Таблица: ai_messages (Сообщения)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Мультимодальный контент
  attachments JSONB DEFAULT '[]',
  
  -- Метаданные генерации
  model VARCHAR(50),
  tokens_input INTEGER,
  tokens_output INTEGER,
  finish_reason VARCHAR(50),
  
  -- Grounding и источники
  grounding_metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_messages_chat_id ON ai_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own chats"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_chats 
      WHERE ai_chats.id = ai_messages.chat_id 
      AND ai_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own chats"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chats 
      WHERE ai_chats.id = ai_messages.chat_id 
      AND ai_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own chats"
  ON ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_chats 
      WHERE ai_chats.id = ai_messages.chat_id 
      AND ai_chats.user_id = auth.uid()
    )
  );

-- ============================================================
-- Таблица: ai_rag_documents (RAG документы)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  
  -- Vertex AI RAG
  corpus_id TEXT,
  rag_file_id TEXT,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_rag_documents_user_id ON ai_rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_rag_documents_company_id ON ai_rag_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_rag_documents_status ON ai_rag_documents(status);

-- RLS
ALTER TABLE ai_rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents"
  ON ai_rag_documents FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Таблица: ai_tool_history (История инструментов)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tool_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  tool_id VARCHAR(50) NOT NULL, -- live-photos, tts, stickers, etc.
  
  -- Входные данные
  input_data JSONB NOT NULL,
  
  -- Результат
  output_url TEXT,
  output_data JSONB,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  
  -- Метаданные
  model VARCHAR(50),
  processing_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_tool_history_user_id ON ai_tool_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_history_tool_id ON ai_tool_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_history_created_at ON ai_tool_history(created_at DESC);

-- RLS
ALTER TABLE ai_tool_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tool history"
  ON ai_tool_history FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Триггеры для updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_assistants_updated_at
  BEFORE UPDATE ON ai_assistants
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER trigger_ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER trigger_ai_rag_documents_updated_at
  BEFORE UPDATE ON ai_rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

-- ============================================================
-- Триггер для обновления счётчика сообщений в чате
-- ============================================================
CREATE OR REPLACE FUNCTION update_ai_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ai_chats 
    SET message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.chat_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ai_chats 
    SET message_count = message_count - 1,
        updated_at = NOW()
    WHERE id = OLD.chat_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_messages_count
  AFTER INSERT OR DELETE ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_message_count();

-- ============================================================
-- Вставка дефолтных ассистентов
-- ============================================================
INSERT INTO ai_assistants (user_id, name, description, system_prompt, emoji, model, color, is_public, is_default)
SELECT 
  auth.uid(),
  name,
  description,
  system_prompt,
  emoji,
  model,
  color,
  true,
  true
FROM (VALUES
  ('Юрист', 'Консультации по правовым вопросам, анализ документов', 
   'Ты опытный юрист. Отвечай на вопросы о законодательстве, помогай анализировать договоры и документы. Давай практичные советы, но напоминай о необходимости консультации со специалистом.',
   '⚖️', 'gemini-2.5-pro', '#6366f1'),
  ('Копирайтер', 'Написание текстов, SEO-оптимизация, рерайт',
   'Ты профессиональный копирайтер. Пиши убедительные тексты, помогай с заголовками и структурой. Учитывай целевую аудиторию и цели текста.',
   '✍️', 'gemini-2.5-flash', '#f59e0b'),
  ('Маркетолог', 'Маркетинговые стратегии, анализ рынка, идеи',
   'Ты эксперт в маркетинге. Помогай разрабатывать стратегии продвижения, анализировать рынок и конкурентов. Предлагай креативные идеи для кампаний.',
   '📈', 'gemini-2.5-pro', '#10b981'),
  ('Переводчик', 'Перевод текстов на 50+ языков с контекстом',
   'Ты профессиональный переводчик. Переводи тексты с сохранением смысла и стиля. Учитывай культурный контекст и особенности языков.',
   '🌍', 'gemini-2.5-flash', '#3b82f6'),
  ('Аналитик', 'Анализ данных, отчёты, визуализация',
   'Ты аналитик данных. Помогай интерпретировать данные, находить закономерности и делать выводы. Предлагай способы визуализации результатов.',
   '📊', 'gemini-2.5-pro', '#8b5cf6'),
  ('Программист', 'Код, отладка, архитектура, code review',
   'Ты опытный программист. Пиши чистый код, помогай с отладкой и архитектурными решениями. Объясняй сложные концепции простым языком.',
   '💻', 'gemini-3-pro', '#ec4899')
) AS t(name, description, system_prompt, emoji, model, color)
WHERE NOT EXISTS (SELECT 1 FROM ai_assistants WHERE is_default = true LIMIT 1);
