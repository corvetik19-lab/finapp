-- Создание таблицы для хранения промптов
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  
  -- Категория промпта
  category VARCHAR(100),
  
  -- Теги для поиска
  tags TEXT[], -- массив тегов
  
  -- Для какой нейросети предназначен
  ai_model VARCHAR(100), -- 'ChatGPT', 'Claude', 'Gemini', 'Universal' и т.д.
  
  -- Избранное
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Счётчик использований
  usage_count INTEGER DEFAULT 0,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Для мягкого удаления
  deleted_at TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX idx_prompts_user_id ON prompts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_category ON prompts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_ai_model ON prompts(ai_model) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_is_favorite ON prompts(is_favorite) WHERE deleted_at IS NULL AND is_favorite = TRUE;
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC) WHERE deleted_at IS NULL;

-- Полнотекстовый поиск
CREATE INDEX idx_prompts_search ON prompts USING GIN(
  to_tsvector('russian', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(prompt_text, '')
  )
) WHERE deleted_at IS NULL;

-- RLS политики
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои промпты
CREATE POLICY "Users can view own prompts"
  ON prompts FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Пользователь может создавать свои промпты
CREATE POLICY "Users can create own prompts"
  ON prompts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Пользователь может обновлять свои промпты
CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Пользователь может удалять свои промпты (мягкое удаление)
CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  USING (user_id = auth.uid());

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE prompts IS 'Хранилище промптов для нейросетей';
COMMENT ON COLUMN prompts.title IS 'Название промпта';
COMMENT ON COLUMN prompts.description IS 'Описание промпта';
COMMENT ON COLUMN prompts.prompt_text IS 'Текст промпта';
COMMENT ON COLUMN prompts.category IS 'Категория (Работа, Творчество, Обучение и т.д.)';
COMMENT ON COLUMN prompts.tags IS 'Теги для поиска';
COMMENT ON COLUMN prompts.ai_model IS 'Для какой нейросети (ChatGPT, Claude, Universal)';
COMMENT ON COLUMN prompts.is_favorite IS 'Избранный промпт';
COMMENT ON COLUMN prompts.usage_count IS 'Количество использований';
COMMENT ON COLUMN prompts.last_used_at IS 'Дата последнего использования';
