-- Таблица для хранения индивидуальных цен организаций
-- Позволяет задать свои цены для тарифов на уровне организации

CREATE TABLE IF NOT EXISTS organization_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Переопределение базовых цен тарифа (в копейках)
  base_price_monthly INTEGER, -- NULL = использовать стандартную цену
  base_price_yearly INTEGER,
  
  -- Переопределение цен за дополнительного пользователя (в копейках)
  price_per_user_monthly INTEGER,
  price_per_user_yearly INTEGER,
  
  -- Количество включённых пользователей (переопределение)
  users_included INTEGER,
  max_users INTEGER,
  
  -- Заметки для администратора
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Одна запись на организацию
  UNIQUE(organization_id)
);

-- RLS политики
ALTER TABLE organization_price_overrides ENABLE ROW LEVEL SECURITY;

-- Только супер-админы могут управлять переопределениями цен
CREATE POLICY "Super admins can manage price overrides"
  ON organization_price_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.global_role = 'super_admin'
    )
  );

-- Индекс для быстрого поиска
CREATE INDEX idx_org_price_overrides_org_id ON organization_price_overrides(organization_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_price_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_overrides_updated_at
  BEFORE UPDATE ON organization_price_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_price_overrides_updated_at();

-- Комментарии
COMMENT ON TABLE organization_price_overrides IS 'Индивидуальные цены для организаций';
COMMENT ON COLUMN organization_price_overrides.base_price_monthly IS 'Переопределённая базовая цена за месяц (в копейках). NULL = стандартная цена';
COMMENT ON COLUMN organization_price_overrides.price_per_user_monthly IS 'Переопределённая цена за доп. пользователя в месяц (в копейках)';
