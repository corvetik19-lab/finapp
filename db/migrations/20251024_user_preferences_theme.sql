-- Миграция: добавление поддержки темы оформления в user_preferences
-- Дата: 2025-10-24

-- Создаём таблицу user_preferences, если её ещё нет
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'ru',
  currency TEXT DEFAULT 'RUB',
  date_format TEXT DEFAULT 'DD.MM.YYYY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем комментарии к таблице
COMMENT ON TABLE user_preferences IS 'Персональные настройки пользователя (тема, язык, валюта и т.д.)';
COMMENT ON COLUMN user_preferences.theme IS 'Тема оформления: light, dark или auto (следует системным настройкам)';
COMMENT ON COLUMN user_preferences.language IS 'Язык интерфейса (ru, en и т.д.)';
COMMENT ON COLUMN user_preferences.currency IS 'Валюта по умолчанию (RUB, USD и т.д.)';

-- Включаем RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь может читать только свои настройки
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователь может создавать свои настройки
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может обновлять только свои настройки
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Создаём индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
