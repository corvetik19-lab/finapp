-- Складской учёт (номенклатура, приход/расход, остатки)

-- Склады
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  
  -- Ответственное лицо
  responsible_person VARCHAR(200),
  
  -- Тип склада
  warehouse_type VARCHAR(20) DEFAULT 'main' CHECK (warehouse_type IN (
    'main', 'retail', 'production', 'transit'
  )),
  
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_company ON warehouse_locations(company_id);

-- Единицы измерения
CREATE TABLE IF NOT EXISTS warehouse_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(50) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  code VARCHAR(10), -- ОКЕИ код
  
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, short_name)
);

CREATE INDEX IF NOT EXISTS idx_units_company ON warehouse_units(company_id);

-- Номенклатура (товары/материалы)
CREATE TABLE IF NOT EXISTS warehouse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Основные данные
  name VARCHAR(500) NOT NULL,
  sku VARCHAR(100), -- артикул
  barcode VARCHAR(50),
  
  -- Категория
  category VARCHAR(200),
  subcategory VARCHAR(200),
  
  -- Единица измерения
  unit_id UUID REFERENCES warehouse_units(id) ON DELETE SET NULL,
  unit_name VARCHAR(50) DEFAULT 'шт',
  
  -- Цены
  purchase_price BIGINT DEFAULT 0, -- закупочная
  selling_price BIGINT DEFAULT 0, -- продажная
  
  -- НДС
  vat_rate DECIMAL(5,2) DEFAULT 20,
  
  -- Минимальный остаток
  min_stock DECIMAL(15,4) DEFAULT 0,
  
  -- Связь с тендером
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  -- Связь с бухгалтерским счётом
  account_id UUID REFERENCES accounting_chart_of_accounts(id) ON DELETE SET NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_items_company ON warehouse_items(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_sku ON warehouse_items(sku);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_barcode ON warehouse_items(barcode);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_category ON warehouse_items(category);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_tender ON warehouse_items(tender_id);

-- Остатки на складах
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES warehouse_items(id) ON DELETE CASCADE,
  
  quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,4) DEFAULT 0, -- зарезервировано
  available_quantity DECIMAL(15,4) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  
  -- Средняя цена
  average_cost BIGINT DEFAULT 0,
  
  -- Общая стоимость
  total_cost BIGINT GENERATED ALWAYS AS (ROUND(quantity * average_cost)) STORED,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(warehouse_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_company ON warehouse_stock(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_item ON warehouse_stock(item_id);

-- Складские документы
CREATE TABLE IF NOT EXISTS warehouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип документа
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN (
    'receipt', 'shipment', 'transfer', 'write_off', 'inventory', 'return'
  )),
  
  -- Номер и дата
  document_number INTEGER NOT NULL,
  document_date DATE NOT NULL,
  
  -- Склады
  warehouse_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  target_warehouse_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL, -- для перемещения
  
  -- Контрагент
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500),
  
  -- Связь с документами
  source_document_type VARCHAR(50),
  source_document_id UUID,
  
  -- Суммы
  total_quantity DECIMAL(15,4) DEFAULT 0,
  total_amount BIGINT DEFAULT 0,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'confirmed', 'cancelled'
  )),
  
  -- Связь с тендером
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_docs_company ON warehouse_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_type ON warehouse_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_warehouse ON warehouse_documents(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_date ON warehouse_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_status ON warehouse_documents(status);

-- Позиции складских документов
CREATE TABLE IF NOT EXISTS warehouse_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES warehouse_documents(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES warehouse_items(id) ON DELETE RESTRICT,
  
  -- Количество
  quantity DECIMAL(15,4) NOT NULL,
  
  -- Цена и сумма
  price BIGINT NOT NULL DEFAULT 0,
  amount BIGINT GENERATED ALWAYS AS (ROUND(quantity * price)) STORED,
  
  -- НДС
  vat_rate DECIMAL(5,2) DEFAULT 20,
  vat_amount BIGINT,
  
  -- Позиция
  position INTEGER DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_items_document ON warehouse_document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_items_item ON warehouse_document_items(item_id);

-- История движений
CREATE TABLE IF NOT EXISTS warehouse_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип движения
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'in', 'out', 'transfer_in', 'transfer_out'
  )),
  
  -- Склад и товар
  warehouse_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES warehouse_items(id) ON DELETE CASCADE,
  
  -- Количество (положительное для прихода, отрицательное для расхода)
  quantity DECIMAL(15,4) NOT NULL,
  
  -- Цена за единицу
  unit_cost BIGINT NOT NULL DEFAULT 0,
  
  -- Остаток после движения
  balance_after DECIMAL(15,4) NOT NULL,
  
  -- Связь с документом
  document_id UUID REFERENCES warehouse_documents(id) ON DELETE SET NULL,
  document_item_id UUID REFERENCES warehouse_document_items(id) ON DELETE SET NULL,
  
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_company ON warehouse_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON warehouse_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_item ON warehouse_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON warehouse_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_movements_document ON warehouse_movements(document_id);

-- RLS policies
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_movements ENABLE ROW LEVEL SECURITY;

-- RLS для складов
CREATE POLICY "Users can manage warehouses of their company"
  ON warehouse_locations FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для единиц измерения
CREATE POLICY "Users can manage units of their company"
  ON warehouse_units FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для номенклатуры
CREATE POLICY "Users can manage items of their company"
  ON warehouse_items FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для остатков
CREATE POLICY "Users can manage stock of their company"
  ON warehouse_stock FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для документов
CREATE POLICY "Users can manage warehouse documents of their company"
  ON warehouse_documents FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для позиций документов
CREATE POLICY "Users can manage document items"
  ON warehouse_document_items FOR ALL
  USING (document_id IN (
    SELECT wd.id FROM warehouse_documents wd
    WHERE wd.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для движений
CREATE POLICY "Users can view movements of their company"
  ON warehouse_movements FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Triggers для updated_at
CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_warehouse_items_updated_at
  BEFORE UPDATE ON warehouse_items
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_warehouse_documents_updated_at
  BEFORE UPDATE ON warehouse_documents
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

-- Функция обновления остатков при подтверждении документа
CREATE OR REPLACE FUNCTION update_warehouse_stock_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  current_stock RECORD;
  new_quantity DECIMAL(15,4);
  new_avg_cost BIGINT;
  movement_qty DECIMAL(15,4);
  movement_type_val VARCHAR(20);
BEGIN
  -- Только при изменении статуса на confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    FOR item IN
      SELECT * FROM warehouse_document_items WHERE document_id = NEW.id
    LOOP
      -- Определяем тип движения и количество
      CASE NEW.document_type
        WHEN 'receipt' THEN
          movement_type_val := 'in';
          movement_qty := item.quantity;
        WHEN 'shipment' THEN
          movement_type_val := 'out';
          movement_qty := -item.quantity;
        WHEN 'write_off' THEN
          movement_type_val := 'out';
          movement_qty := -item.quantity;
        WHEN 'return' THEN
          movement_type_val := 'in';
          movement_qty := item.quantity;
        ELSE
          movement_qty := 0;
      END CASE;

      IF movement_qty != 0 THEN
        -- Получаем текущий остаток
        SELECT * INTO current_stock
        FROM warehouse_stock
        WHERE warehouse_id = NEW.warehouse_id AND item_id = item.item_id;

        IF current_stock IS NULL THEN
          -- Создаём запись остатка
          new_quantity := movement_qty;
          new_avg_cost := item.price;
          
          INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, average_cost)
          VALUES (NEW.company_id, NEW.warehouse_id, item.item_id, new_quantity, new_avg_cost);
        ELSE
          -- Обновляем остаток
          new_quantity := current_stock.quantity + movement_qty;
          
          -- Пересчитываем среднюю цену при приходе
          IF movement_qty > 0 THEN
            new_avg_cost := ROUND(
              (current_stock.quantity * current_stock.average_cost + movement_qty * item.price) / 
              NULLIF(new_quantity, 0)
            );
          ELSE
            new_avg_cost := current_stock.average_cost;
          END IF;
          
          UPDATE warehouse_stock
          SET quantity = new_quantity, average_cost = new_avg_cost
          WHERE id = current_stock.id;
        END IF;

        -- Записываем движение
        INSERT INTO warehouse_movements (
          company_id, movement_type, warehouse_id, item_id,
          quantity, unit_cost, balance_after, document_id, document_item_id
        ) VALUES (
          NEW.company_id, movement_type_val, NEW.warehouse_id, item.item_id,
          movement_qty, item.price, new_quantity, NEW.id, item.id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warehouse_document_confirm_trigger
  AFTER UPDATE ON warehouse_documents
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_stock_on_confirm();
