-- Таблица настроек дашборда пользователя
CREATE TABLE IF NOT EXISTS user_dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настройки виджетов
  widget_layout JSONB DEFAULT '[]'::jsonb, -- Порядок и видимость виджетов
  theme VARCHAR(50) DEFAULT 'light', -- light, dark, auto
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Один пользователь - одна запись настроек
  CONSTRAINT unique_user_dashboard_settings UNIQUE(user_id)
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user_id ON user_dashboard_settings(user_id);

-- Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_dashboard_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления
CREATE TRIGGER dashboard_settings_updated_at
  BEFORE UPDATE ON user_dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_settings_updated_at();

-- Row Level Security
ALTER TABLE user_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои настройки
CREATE POLICY "Users can view own dashboard settings"
  ON user_dashboard_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователь может создавать свои настройки
CREATE POLICY "Users can create own dashboard settings"
  ON user_dashboard_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может обновлять свои настройки
CREATE POLICY "Users can update own dashboard settings"
  ON user_dashboard_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может удалять свои настройки
CREATE POLICY "Users can delete own dashboard settings"
  ON user_dashboard_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии
COMMENT ON TABLE user_dashboard_settings IS 'Настройки дашборда для каждого пользователя';
COMMENT ON COLUMN user_dashboard_settings.widget_layout IS 'JSON массив с порядком и видимостью виджетов';
COMMENT ON COLUMN user_dashboard_settings.theme IS 'Тема оформления: light, dark, auto';
