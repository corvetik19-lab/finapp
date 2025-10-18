-- Таблица для чатов с AI
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Новый чат',
  model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Таблица для сообщений в чатах
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого доступа
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_updated_at ON ai_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_chat_id ON ai_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS политики для ai_chats
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON ai_chats FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own chats"
  ON ai_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON ai_chats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete their own chats"
  ON ai_chats FOR DELETE
  USING (auth.uid() = user_id);

-- RLS политики для ai_messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats"
  ON ai_messages FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM ai_chats
      WHERE ai_chats.id = ai_messages.chat_id
      AND ai_chats.user_id = auth.uid()
      AND ai_chats.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can create messages in their chats"
  ON ai_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM ai_chats
      WHERE ai_chats.id = ai_messages.chat_id
      AND ai_chats.user_id = auth.uid()
      AND ai_chats.deleted_at IS NULL
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ai_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chats
  SET updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at при добавлении сообщения
CREATE TRIGGER update_chat_timestamp
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_updated_at();

-- Комментарии для документации
COMMENT ON TABLE ai_chats IS 'История чатов с AI ассистентом';
COMMENT ON TABLE ai_messages IS 'Сообщения в чатах с AI';
COMMENT ON COLUMN ai_chats.title IS 'Название чата (автогенерируется из первого сообщения)';
COMMENT ON COLUMN ai_chats.model IS 'Модель AI, используемая в чате';
COMMENT ON COLUMN ai_messages.role IS 'Роль отправителя: user, assistant, system';
