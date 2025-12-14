-- Бухгалтерский модуль для режима Тендеры
-- Создание таблиц для полноценной бухгалтерии

-- ============================================
-- 1. Настройки бухгалтерии организации
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Форма организации: ip, ooo, ao
  organization_type TEXT NOT NULL DEFAULT 'ooo',
  
  -- Реквизиты организации
  full_name TEXT NOT NULL DEFAULT '',
  short_name TEXT,
  inn TEXT NOT NULL DEFAULT '',
  kpp TEXT,
  ogrn TEXT,
  okpo TEXT,
  okved TEXT,
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  
  -- Банковские реквизиты
  bank_name TEXT,
  bank_bik TEXT,
  bank_account TEXT,
  bank_corr_account TEXT,
  
  -- Руководитель и бухгалтер
  director_name TEXT,
  director_position TEXT DEFAULT 'Директор',
  accountant_name TEXT,
  
  -- Система налогообложения
  -- osno, usn_income, usn_income_expense, psn, ausn
  tax_system TEXT NOT NULL DEFAULT 'usn_income',
  vat_payer BOOLEAN DEFAULT false,
  vat_rate INTEGER DEFAULT 20,
  
  -- Настройки УСН
  usn_rate NUMERIC(5,2) DEFAULT 6,
  usn_min_tax_rate NUMERIC(5,2) DEFAULT 1,
  
  -- Настройки нумерации документов
  invoice_prefix TEXT DEFAULT 'СЧ',
  invoice_next_number INTEGER DEFAULT 1,
  act_prefix TEXT DEFAULT 'АКТ',
  act_next_number INTEGER DEFAULT 1,
  waybill_prefix TEXT DEFAULT 'ТН',
  waybill_next_number INTEGER DEFAULT 1,
  upd_prefix TEXT DEFAULT 'УПД',
  upd_next_number INTEGER DEFAULT 1,
  contract_prefix TEXT DEFAULT 'ДОГ',
  contract_next_number INTEGER DEFAULT 1,
  
  -- Начало финансового года (месяц 1-12)
  fiscal_year_start INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id)
);

-- ============================================
-- 2. Контрагенты
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Основная информация
  name TEXT NOT NULL,
  short_name TEXT,
  organization_type TEXT DEFAULT 'ooo',
  
  -- Реквизиты
  inn TEXT,
  kpp TEXT,
  ogrn TEXT,
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  
  -- Банковские реквизиты
  bank_name TEXT,
  bank_bik TEXT,
  bank_account TEXT,
  bank_corr_account TEXT,
  
  -- Контакты
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  
  -- Тип контрагента
  is_customer BOOLEAN DEFAULT true,
  is_supplier BOOLEAN DEFAULT false,
  
  -- Связь со справочником заказчиков тендеров
  tender_customer_id UUID,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- 3. Документы
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Тип документа: invoice, act, waybill, upd, contract, invoice_factura
  document_type TEXT NOT NULL,
  
  -- Номер и дата
  document_number TEXT NOT NULL,
  document_date DATE NOT NULL,
  
  -- Связь с тендером
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  -- Контрагент
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name TEXT NOT NULL,
  counterparty_inn TEXT,
  counterparty_kpp TEXT,
  counterparty_address TEXT,
  
  -- Суммы (в копейках)
  subtotal BIGINT NOT NULL DEFAULT 0,
  vat_amount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  
  vat_rate INTEGER,
  
  -- Для договоров
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Статус: draft, issued, paid, cancelled
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  paid_amount BIGINT DEFAULT 0,
  
  -- Дополнительно
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- PDF файл
  pdf_path TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- 4. Позиции документов
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES accounting_documents(id) ON DELETE CASCADE,
  
  -- Порядковый номер позиции
  position INTEGER NOT NULL DEFAULT 1,
  
  -- Товар/услуга
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'шт',
  quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
  
  -- Цены (в копейках)
  price_per_unit BIGINT NOT NULL,
  vat_rate INTEGER DEFAULT 0,
  vat_amount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. КУДиР (Книга учёта доходов и расходов)
-- ============================================
CREATE TABLE IF NOT EXISTS kudir_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Номер и дата записи
  entry_number INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  
  -- Связи с другими сущностями
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  -- Первичный документ
  primary_document_type TEXT,
  primary_document_number TEXT,
  primary_document_date DATE,
  
  -- Содержание операции
  description TEXT NOT NULL,
  
  -- Суммы (в копейках)
  income BIGINT DEFAULT 0,
  expense BIGINT DEFAULT 0,
  
  -- Для УСН Доходы-Расходы: учитываемые расходы
  deductible_expense BIGINT DEFAULT 0,
  
  -- Метаданные
  is_manual BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. Налоговые платежи
-- ============================================
CREATE TABLE IF NOT EXISTS tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип налога: usn, vat, income_tax, property_tax, insurance_fixed, insurance_additional
  tax_type TEXT NOT NULL,
  tax_name TEXT NOT NULL,
  
  -- Период
  period_year INTEGER NOT NULL,
  period_quarter INTEGER,
  period_month INTEGER,
  
  -- Суммы (в копейках)
  calculated_amount BIGINT NOT NULL,
  paid_amount BIGINT DEFAULT 0,
  
  -- Сроки
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  -- Статус: pending, paid, overdue, partial
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Детали расчёта
  calculation_details JSONB DEFAULT '{}',
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. События налогового календаря
-- ============================================
CREATE TABLE IF NOT EXISTS tax_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип события: payment, report, deadline
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Дата события
  event_date DATE NOT NULL,
  
  -- Связь с платежом
  tax_payment_id UUID REFERENCES tax_payments(id) ON DELETE CASCADE,
  
  -- Напоминания
  reminder_days INTEGER DEFAULT 3,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Статус выполнения
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Индексы
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounting_settings_company ON accounting_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_counterparties_company ON accounting_counterparties(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_counterparties_inn ON accounting_counterparties(inn);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_company ON accounting_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_type ON accounting_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_date ON accounting_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_tender ON accounting_documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_counterparty ON accounting_documents(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_accounting_document_items_document ON accounting_document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_kudir_entries_company ON kudir_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_kudir_entries_date ON kudir_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_kudir_entries_document ON kudir_entries(document_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_company ON tax_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_due_date ON tax_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_status ON tax_payments(status);
CREATE INDEX IF NOT EXISTS idx_tax_calendar_events_company ON tax_calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_calendar_events_date ON tax_calendar_events(event_date);

-- ============================================
-- RLS политики
-- ============================================

-- Включаем RLS
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudir_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calendar_events ENABLE ROW LEVEL SECURITY;

-- Политики для accounting_settings
CREATE POLICY "accounting_settings_select" ON accounting_settings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "accounting_settings_insert" ON accounting_settings
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_settings_update" ON accounting_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_settings_delete" ON accounting_settings
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Политики для accounting_counterparties
CREATE POLICY "accounting_counterparties_select" ON accounting_counterparties
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "accounting_counterparties_insert" ON accounting_counterparties
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_counterparties_update" ON accounting_counterparties
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_counterparties_delete" ON accounting_counterparties
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Политики для accounting_documents
CREATE POLICY "accounting_documents_select" ON accounting_documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "accounting_documents_insert" ON accounting_documents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_documents_update" ON accounting_documents
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "accounting_documents_delete" ON accounting_documents
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Политики для accounting_document_items (через document_id)
CREATE POLICY "accounting_document_items_select" ON accounting_document_items
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM accounting_documents WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "accounting_document_items_insert" ON accounting_document_items
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM accounting_documents WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "accounting_document_items_update" ON accounting_document_items
  FOR UPDATE USING (
    document_id IN (
      SELECT id FROM accounting_documents WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "accounting_document_items_delete" ON accounting_document_items
  FOR DELETE USING (
    document_id IN (
      SELECT id FROM accounting_documents WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Политики для kudir_entries
CREATE POLICY "kudir_entries_select" ON kudir_entries
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "kudir_entries_insert" ON kudir_entries
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "kudir_entries_update" ON kudir_entries
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "kudir_entries_delete" ON kudir_entries
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Политики для tax_payments
CREATE POLICY "tax_payments_select" ON tax_payments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tax_payments_insert" ON tax_payments
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tax_payments_update" ON tax_payments
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tax_payments_delete" ON tax_payments
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Политики для tax_calendar_events
CREATE POLICY "tax_calendar_events_select" ON tax_calendar_events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tax_calendar_events_insert" ON tax_calendar_events
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tax_calendar_events_update" ON tax_calendar_events
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tax_calendar_events_delete" ON tax_calendar_events
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- Функция обновления updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_accounting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_accounting_settings_updated_at
  BEFORE UPDATE ON accounting_settings
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_accounting_counterparties_updated_at
  BEFORE UPDATE ON accounting_counterparties
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_accounting_documents_updated_at
  BEFORE UPDATE ON accounting_documents
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_kudir_entries_updated_at
  BEFORE UPDATE ON kudir_entries
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_tax_payments_updated_at
  BEFORE UPDATE ON tax_payments
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();
