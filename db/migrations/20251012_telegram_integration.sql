-- Telegram Integration
-- Добавление поддержки Telegram бота

-- Добавляем поле telegram_user_id в user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS telegram_user_id TEXT UNIQUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_settings_telegram_user_id ON user_settings(telegram_user_id) WHERE telegram_user_id IS NOT NULL;

-- Комментарии
COMMENT ON COLUMN user_settings.telegram_user_id IS 'Telegram User ID для webhook интеграции';
COMMENT ON COLUMN user_settings.telegram_username IS 'Telegram username (для удобства)';
COMMENT ON COLUMN user_settings.telegram_notifications_enabled IS 'Включены ли уведомления в Telegram';
COMMENT ON COLUMN user_settings.telegram_linked_at IS 'Дата привязки Telegram';
