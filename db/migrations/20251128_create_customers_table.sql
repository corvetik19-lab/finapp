-- Создание таблицы заказчиков для тендерного модуля
-- Заказчики - это организации, для которых компания участвует в тендерах

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Основная информация
  name VARCHAR(500) NOT NULL,
  short_name VARCHAR(200),
  
  -- Реквизиты
  inn VARCHAR(12),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  region VARCHAR(100),
  
  -- Контакты
  contact_person VARCHAR(200),
  phone VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(500),
  
  -- Дополнительно
  customer_type VARCHAR(50) DEFAULT 'government', -- government, commercial, municipal
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Индексы
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_inn ON customers(inn);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят заказчиков своей организации
CREATE POLICY customers_select_policy ON customers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY customers_insert_policy ON customers
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY customers_update_policy ON customers
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY customers_delete_policy ON customers
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Комментарии
COMMENT ON TABLE customers IS 'Справочник заказчиков для тендерного модуля';
COMMENT ON COLUMN customers.customer_type IS 'Тип заказчика: government - государственный, commercial - коммерческий, municipal - муниципальный';
