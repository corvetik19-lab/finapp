-- Миграция: Webhooks для интеграций
-- Дата: 2024-10-23
-- Описание: Таблица для хранения webhook подписок пользователей

-- Создаём таблицу webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настройки webhook
  url TEXT NOT NULL, -- URL куда отправлять
  events TEXT[] NOT NULL DEFAULT '{}', -- Массив событий: ['transaction.created', 'transaction.updated']
  secret TEXT, -- Секрет для подписи (опционально)
  
  -- Метаданные
  name TEXT, -- Название для удобства
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Статистика
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  total_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_events CHECK (array_length(events, 1) > 0)
);

-- Индексы
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- RLS (Row Level Security)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON webhooks FOR DELETE
  USING (auth.uid() = user_id);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhooks_updated_at();

-- Комментарии
COMMENT ON TABLE webhooks IS 'Webhook подписки пользователей для интеграций';
COMMENT ON COLUMN webhooks.events IS 'Массив событий: transaction.created, transaction.updated, transaction.deleted, budget.exceeded и т.д.';
COMMENT ON COLUMN webhooks.secret IS 'Секрет для HMAC подписи payload (опционально)';
