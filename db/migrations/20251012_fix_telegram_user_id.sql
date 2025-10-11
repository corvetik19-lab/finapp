-- Исправление: добавляем telegram_user_id в notification_preferences
-- Это Telegram User ID пользователя, который используется для идентификации в webhook

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS telegram_user_id TEXT;

-- Индекс для быстрого поиска по telegram_user_id
CREATE INDEX IF NOT EXISTS idx_notification_preferences_telegram_user_id 
ON notification_preferences(telegram_user_id) 
WHERE telegram_user_id IS NOT NULL;

COMMENT ON COLUMN notification_preferences.telegram_user_id IS 'Telegram User ID для webhook интеграции (from.id)';
