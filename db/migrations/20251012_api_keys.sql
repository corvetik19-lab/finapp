-- REST API Keys
-- Система API ключей для внешних интеграций

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- первые 8 символов для идентификации
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY['read']::TEXT[], -- read, write, delete
  rate_limit INTEGER DEFAULT 1000, -- запросов в час
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_scopes CHECK (scopes <@ ARRAY['read', 'write', 'delete']::TEXT[])
);

-- RLS
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

-- Индексы
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;

-- Статистика использования API
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для статистики
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API usage stats"
ON api_usage_stats FOR SELECT
USING (auth.uid() = user_id);

-- Индексы для статистики
CREATE INDEX idx_api_usage_stats_api_key_id ON api_usage_stats(api_key_id);
CREATE INDEX idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX idx_api_usage_stats_created_at ON api_usage_stats(created_at);

-- Функция для очистки старой статистики (хранить 30 дней)
CREATE OR REPLACE FUNCTION clean_old_api_stats()
RETURNS void AS $$
BEGIN
  DELETE FROM api_usage_stats
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON TABLE api_keys IS 'API ключи для REST API доступа';
COMMENT ON TABLE api_usage_stats IS 'Статистика использования REST API';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 хеш API ключа';
COMMENT ON COLUMN api_keys.key_prefix IS 'Первые 8 символов ключа для идентификации';
COMMENT ON COLUMN api_keys.scopes IS 'Разрешения: read, write, delete';
COMMENT ON COLUMN api_keys.rate_limit IS 'Лимит запросов в час';
