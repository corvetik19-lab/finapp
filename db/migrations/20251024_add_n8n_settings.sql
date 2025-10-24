-- Добавление настроек n8n в user_preferences
-- Это позволит пользователям подключать свои экземпляры n8n для автоматизации

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS n8n_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_api_key TEXT;

-- Добавляем комментарии для документации
COMMENT ON COLUMN user_preferences.n8n_url IS 'URL адрес n8n instance для автоматизации';
COMMENT ON COLUMN user_preferences.n8n_api_key IS 'API ключ для доступа к n8n (зашифрован)';

-- Создаем индекс для быстрого поиска пользователей с настроенным n8n
CREATE INDEX IF NOT EXISTS idx_user_preferences_n8n_configured 
ON user_preferences(user_id) 
WHERE n8n_url IS NOT NULL AND n8n_api_key IS NOT NULL;
