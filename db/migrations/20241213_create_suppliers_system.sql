-- =====================================================
-- Модуль "Поставщики" - Миграция БД
-- Дата: 13 декабря 2024
-- =====================================================

-- =====================================================
-- 1. Категории поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'Package',
  parent_id UUID REFERENCES supplier_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_categories_company ON supplier_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_parent ON supplier_categories(parent_id);

-- =====================================================
-- 2. Поставщики
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Основная информация
  name VARCHAR(500) NOT NULL,
  short_name VARCHAR(200),
  inn VARCHAR(12),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  
  -- Контакты компании
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Классификация
  category_id UUID REFERENCES supplier_categories(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  tags TEXT[] DEFAULT '{}',
  
  -- Связь с бухгалтерией
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  
  -- Описание
  description TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_inn ON suppliers(inn) WHERE inn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_counterparty ON suppliers(counterparty_id) WHERE counterparty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_name_search ON suppliers USING gin(to_tsvector('russian', name));

-- =====================================================
-- 3. Контакты поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  name VARCHAR(300) NOT NULL,
  position VARCHAR(200),
  department VARCHAR(200),
  
  phone VARCHAR(50),
  phone_mobile VARCHAR(50),
  phone_internal VARCHAR(20),
  email VARCHAR(255),
  telegram VARCHAR(100),
  
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_phone ON supplier_contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_phone_mobile ON supplier_contacts(phone_mobile) WHERE phone_mobile IS NOT NULL;

-- =====================================================
-- 4. Заметки поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  title VARCHAR(300),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier ON supplier_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_notes_pinned ON supplier_notes(supplier_id, is_pinned) WHERE is_pinned = true;

-- =====================================================
-- 5. Файлы поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  file_type VARCHAR(30) DEFAULT 'other' CHECK (file_type IN (
    'commercial_offer', 'invoice', 'contract', 'price_list', 
    'certificate', 'license', 'other'
  )),
  
  description TEXT,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_files_supplier ON supplier_files(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_files_type ON supplier_files(file_type);
CREATE INDEX IF NOT EXISTS idx_supplier_files_tender ON supplier_files(tender_id) WHERE tender_id IS NOT NULL;

-- =====================================================
-- 6. Связь поставщиков с тендерами
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  role VARCHAR(30) DEFAULT 'participant' CHECK (role IN (
    'participant', 'winner', 'subcontractor', 'partner'
  )),
  status VARCHAR(30) DEFAULT 'invited' CHECK (status IN (
    'invited', 'confirmed', 'submitted', 'rejected', 'won', 'lost'
  )),
  
  proposed_price BIGINT,
  final_price BIGINT,
  notes TEXT,
  
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(supplier_id, tender_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_tenders_supplier ON supplier_tenders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tenders_tender ON supplier_tenders(tender_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tenders_status ON supplier_tenders(status);

-- =====================================================
-- 7. Настройки Mango Office
-- =====================================================

CREATE TABLE IF NOT EXISTS mango_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- API credentials (зашифрованы на уровне приложения)
  api_key VARCHAR(200) NOT NULL,
  api_salt VARCHAR(200) NOT NULL,
  
  -- Настройки
  is_enabled BOOLEAN DEFAULT true,
  record_calls BOOLEAN DEFAULT true,
  
  -- Маппинг пользователей на внутренние номера
  -- { "user_id": "extension" }
  extension_mapping JSONB DEFAULT '{}',
  
  -- Webhook
  webhook_url TEXT,
  webhook_secret VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. История звонков
-- =====================================================

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Связи
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES supplier_contacts(id) ON DELETE SET NULL,
  
  -- Данные звонка от Mango
  mango_call_id VARCHAR(100),
  mango_entry_id VARCHAR(100),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  extension VARCHAR(20),
  
  -- Временные метки
  started_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  duration INTEGER DEFAULT 0,
  talk_duration INTEGER DEFAULT 0,
  
  -- Статус
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'ringing', 'answered', 'completed', 'missed', 'busy', 'failed', 'cancelled'
  )),
  
  -- Дополнительно
  recording_url TEXT,
  recording_id VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_history_company ON call_history(company_id);
CREATE INDEX IF NOT EXISTS idx_call_history_supplier ON call_history(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_history_contact ON call_history(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_history_from ON call_history(from_number);
CREATE INDEX IF NOT EXISTS idx_call_history_to ON call_history(to_number);
CREATE INDEX IF NOT EXISTS idx_call_history_started ON call_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_mango_call ON call_history(mango_call_id) WHERE mango_call_id IS NOT NULL;

-- =====================================================
-- 9. RLS Policies
-- =====================================================

-- Включаем RLS
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mango_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- supplier_categories
CREATE POLICY "supplier_categories_select" ON supplier_categories
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "supplier_categories_all" ON supplier_categories
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- suppliers
CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "suppliers_all" ON suppliers
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- supplier_contacts (через supplier)
CREATE POLICY "supplier_contacts_select" ON supplier_contacts
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "supplier_contacts_all" ON supplier_contacts
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- supplier_notes (через supplier)
CREATE POLICY "supplier_notes_select" ON supplier_notes
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "supplier_notes_all" ON supplier_notes
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- supplier_files (через supplier)
CREATE POLICY "supplier_files_select" ON supplier_files
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "supplier_files_all" ON supplier_files
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- supplier_tenders (через supplier)
CREATE POLICY "supplier_tenders_select" ON supplier_tenders
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "supplier_tenders_all" ON supplier_tenders
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- mango_settings
CREATE POLICY "mango_settings_select" ON mango_settings
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "mango_settings_all" ON mango_settings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- call_history
CREATE POLICY "call_history_select" ON call_history
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "call_history_all" ON call_history
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- =====================================================
-- 10. Триггеры для updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_supplier_categories_updated_at ON supplier_categories;
CREATE TRIGGER update_supplier_categories_updated_at
  BEFORE UPDATE ON supplier_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_contacts_updated_at ON supplier_contacts;
CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_notes_updated_at ON supplier_notes;
CREATE TRIGGER update_supplier_notes_updated_at
  BEFORE UPDATE ON supplier_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_tenders_updated_at ON supplier_tenders;
CREATE TRIGGER update_supplier_tenders_updated_at
  BEFORE UPDATE ON supplier_tenders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mango_settings_updated_at ON mango_settings;
CREATE TRIGGER update_mango_settings_updated_at
  BEFORE UPDATE ON mango_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. Supabase Storage bucket для файлов поставщиков
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-files',
  'supplier-files',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip', 'application/x-rar-compressed']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "supplier_files_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-files');

CREATE POLICY "supplier_files_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-files');

CREATE POLICY "supplier_files_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'supplier-files');

-- =====================================================
-- 12. Дефолтные категории поставщиков (для каждой компании)
-- =====================================================

-- Функция для создания дефолтных категорий при создании компании
CREATE OR REPLACE FUNCTION create_default_supplier_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO supplier_categories (company_id, name, color, icon, sort_order) VALUES
    (NEW.id, 'Товары', '#22c55e', 'Package', 1),
    (NEW.id, 'Услуги', '#3b82f6', 'Briefcase', 2),
    (NEW.id, 'Стройматериалы', '#f59e0b', 'Hammer', 3),
    (NEW.id, 'Оборудование', '#8b5cf6', 'Cpu', 4),
    (NEW.id, 'Транспорт', '#ef4444', 'Truck', 5),
    (NEW.id, 'Прочее', '#6b7280', 'MoreHorizontal', 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_supplier_categories_on_company ON companies;
CREATE TRIGGER create_supplier_categories_on_company
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION create_default_supplier_categories();
