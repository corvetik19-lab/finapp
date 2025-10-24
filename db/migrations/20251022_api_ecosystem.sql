-- =====================================================
-- МИГРАЦИЯ: API ECOSYSTEM (REST API + WEBHOOKS)
-- Дата: 2025-10-22
-- Описание: Таблицы для REST API, Webhooks, Rate Limiting
-- =====================================================

-- ========================================
-- 1. API KEYS - ключи для доступа к API
-- ========================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- название ключа (для удобства)
  key_hash TEXT NOT NULL UNIQUE, -- хеш API ключа (SHA-256)
  key_prefix TEXT NOT NULL, -- первые 8 символов для отображения
  scopes TEXT[] DEFAULT ARRAY['read', 'write'], -- права доступа
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- RLS политики
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 2. API RATE LIMITS - лимиты запросов
-- ========================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_api_rate_limits_key_endpoint ON api_rate_limits(api_key_id, endpoint, window_start);

-- RLS политики (только внутреннее использование)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. WEBHOOKS - регистрация webhook'ов
-- ========================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- URL для отправки webhook
  secret TEXT NOT NULL, -- секрет для HMAC подписи
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- события для подписки
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3, -- количество попыток при ошибке
  timeout_seconds INTEGER DEFAULT 10, -- таймаут запроса
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- RLS политики
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

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

-- ========================================
-- 4. WEBHOOK LOGS - логи отправок
-- ========================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  attempt INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT false,
  duration_ms INTEGER, -- время выполнения в мс
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

-- RLS политики
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for own webhooks"
  ON webhook_logs FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 5. API USAGE STATS - статистика использования
-- ========================================
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_api_usage_stats_key_id ON api_usage_stats(api_key_id);
CREATE INDEX idx_api_usage_stats_created_at ON api_usage_stats(created_at DESC);
CREATE INDEX idx_api_usage_stats_endpoint ON api_usage_stats(endpoint);

-- Партицирование по времени (опционально, для масштабирования)
-- CREATE INDEX idx_api_usage_stats_date ON api_usage_stats((created_at::date));

-- RLS политики
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API usage"
  ON api_usage_stats FOR SELECT
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- 6. ФУНКЦИИ И ТРИГГЕРЫ
-- ========================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Функция для очистки старых логов (>30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Функция для очистки старых статистик (>90 дней)
CREATE OR REPLACE FUNCTION cleanup_old_api_stats()
RETURNS void AS $$
BEGIN
  DELETE FROM api_usage_stats
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. КОММЕНТАРИИ
-- ========================================
COMMENT ON TABLE api_keys IS 'API ключи для доступа к REST API';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting для защиты от злоупотреблений';
COMMENT ON TABLE webhooks IS 'Регистрация webhook endpoints';
COMMENT ON TABLE webhook_logs IS 'История отправок webhook';
COMMENT ON TABLE api_usage_stats IS 'Статистика использования API';

-- ========================================
-- КОНЕЦ МИГРАЦИИ
-- ========================================
