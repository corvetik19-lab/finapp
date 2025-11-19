-- Создание таблиц для логистической системы

-- Водители
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  license_number text NOT NULL,
  vehicle_brand text,
  vehicle_model text,
  vehicle_number text,
  vehicle_capacity_kg numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Отправки
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Основная информация
  tracking_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned')),
  type text NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'express', 'overnight', 'freight')),
  
  -- Отправитель
  sender_name text NOT NULL,
  sender_phone text,
  sender_email text,
  sender_company text,
  sender_street text NOT NULL,
  sender_city text NOT NULL,
  sender_region text,
  sender_postal_code text,
  sender_country text NOT NULL DEFAULT 'Россия',
  sender_lat numeric,
  sender_lng numeric,
  
  -- Получатель
  recipient_name text NOT NULL,
  recipient_phone text,
  recipient_email text,
  recipient_company text,
  recipient_street text NOT NULL,
  recipient_city text NOT NULL,
  recipient_region text,
  recipient_postal_code text,
  recipient_country text NOT NULL DEFAULT 'Россия',
  recipient_lat numeric,
  recipient_lng numeric,
  
  -- Груз
  description text NOT NULL,
  weight_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  value_amount bigint, -- в копейках
  
  -- Даты
  pickup_date timestamptz,
  delivery_date timestamptz,
  estimated_delivery timestamptz,
  
  -- Финансы
  cost_amount bigint NOT NULL DEFAULT 0, -- в копейках
  currency text NOT NULL DEFAULT 'RUB',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  
  -- Исполнители
  driver_id uuid REFERENCES drivers(id),
  courier_company text,
  
  -- Дополнительно
  notes text,
  special_instructions text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- История статусов отправок
CREATE TABLE IF NOT EXISTS shipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  location text,
  notes text,
  user_id uuid REFERENCES auth.users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);

CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_driver_id ON shipments(driver_id);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_date ON shipments(delivery_date);
CREATE INDEX IF NOT EXISTS idx_shipments_deleted_at ON shipments(deleted_at);

CREATE INDEX IF NOT EXISTS idx_shipment_status_history_shipment_id ON shipment_status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_status_history_timestamp ON shipment_status_history(timestamp);

-- RLS политики
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;

-- Политики для drivers
CREATE POLICY "drivers_user_access" ON drivers
  FOR ALL USING (auth.uid() = user_id);

-- Политики для shipments
CREATE POLICY "shipments_user_access" ON shipments
  FOR ALL USING (auth.uid() = user_id);

-- Политики для shipment_status_history
CREATE POLICY "shipment_status_history_user_access" ON shipment_status_history
  FOR ALL USING (
    auth.uid() IN (
      SELECT s.user_id FROM shipments s WHERE s.id = shipment_id
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматической генерации трекинг-номера
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS text AS $$
DECLARE
  tracking_num text;
  counter int := 0;
BEGIN
  LOOP
    tracking_num := 'TRK' || to_char(NOW(), 'YYMMDD') || 
                   LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Проверяем уникальность
    IF NOT EXISTS (SELECT 1 FROM shipments WHERE tracking_number = tracking_num) THEN
      RETURN tracking_num;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      -- Аварийный выход если не можем сгенерировать уникальный номер
      tracking_num := tracking_num || counter::text;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN tracking_num;
END;
$$ language 'plpgsql';

-- Триггер для автоматической генерации трекинг-номера
CREATE OR REPLACE FUNCTION auto_generate_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := generate_tracking_number();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_tracking_number BEFORE INSERT ON shipments
  FOR EACH ROW EXECUTE FUNCTION auto_generate_tracking_number();

-- Функция для автоматического добавления записи в историю статусов
CREATE OR REPLACE FUNCTION add_status_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- При создании или изменении статуса добавляем запись в историю
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO shipment_status_history (shipment_id, status, user_id)
    VALUES (NEW.id, NEW.status, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER shipment_status_history_trigger 
  AFTER INSERT OR UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION add_status_history_entry();
