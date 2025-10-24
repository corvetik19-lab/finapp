-- Таблица настроек email уведомлений
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Типы уведомлений
  budget_alerts_enabled BOOLEAN DEFAULT true,
  transaction_alerts_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT false,
  
  -- Настройки для еженедельной сводки
  weekly_summary_day INTEGER DEFAULT 1 CHECK (weekly_summary_day BETWEEN 1 AND 7), -- 1 = Понедельник, 7 = Воскресенье
  weekly_summary_time TIME DEFAULT '09:00:00',
  
  -- Email адрес (по умолчанию из auth.users, но можно переопределить)
  custom_email VARCHAR(255),
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Один пользователь - одна запись настроек
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON user_email_preferences(user_id);

-- Индекс для CRON задач (найти пользователей с включённой еженедельной сводкой)
CREATE INDEX IF NOT EXISTS idx_email_preferences_weekly_enabled 
  ON user_email_preferences(weekly_summary_enabled, weekly_summary_day, weekly_summary_time)
  WHERE weekly_summary_enabled = true;

-- Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления
CREATE TRIGGER email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- Row Level Security
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои настройки
CREATE POLICY "Users can view own email preferences"
  ON user_email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователь может создавать свои настройки
CREATE POLICY "Users can create own email preferences"
  ON user_email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может обновлять свои настройки
CREATE POLICY "Users can update own email preferences"
  ON user_email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может удалять свои настройки
CREATE POLICY "Users can delete own email preferences"
  ON user_email_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии
COMMENT ON TABLE user_email_preferences IS 'Настройки email уведомлений для каждого пользователя';
COMMENT ON COLUMN user_email_preferences.budget_alerts_enabled IS 'Уведомления о превышении бюджета';
COMMENT ON COLUMN user_email_preferences.transaction_alerts_enabled IS 'Уведомления о крупных транзакциях';
COMMENT ON COLUMN user_email_preferences.weekly_summary_enabled IS 'Еженедельная сводка';
COMMENT ON COLUMN user_email_preferences.weekly_summary_day IS 'День недели для сводки (1=ПН, 7=ВС)';
COMMENT ON COLUMN user_email_preferences.weekly_summary_time IS 'Время отправки сводки';
