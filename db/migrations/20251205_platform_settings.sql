-- Таблица глобальных настроек платформы (только для супер-админа)
-- Хранит настройки в формате ключ-значение с JSONB для сложных структур

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Начальные значения - все режимы включены
INSERT INTO platform_settings (key, value, description)
VALUES (
  'enabled_modes',
  '["finance", "tenders", "personal", "investments"]'::jsonb,
  'Список включённых режимов платформы. Минимум 1 режим должен быть включён.'
)
ON CONFLICT (key) DO NOTHING;

-- RLS политики - только супер-админ может читать и изменять
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Политика чтения - все авторизованные пользователи могут читать
CREATE POLICY "platform_settings_read" ON platform_settings
  FOR SELECT TO authenticated
  USING (true);

-- Политика изменения - только супер-админы (проверяем через profiles.global_role)
CREATE POLICY "platform_settings_update" ON platform_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.global_role = 'super_admin'
    )
  );

COMMENT ON TABLE platform_settings IS 'Глобальные настройки платформы (управляются супер-админом)';
COMMENT ON COLUMN platform_settings.key IS 'Уникальный ключ настройки';
COMMENT ON COLUMN platform_settings.value IS 'Значение настройки в формате JSONB';
