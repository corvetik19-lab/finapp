-- Таблица налоговых платежей для календаря налогов
CREATE TABLE IF NOT EXISTS tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип налога
  tax_type VARCHAR(50) NOT NULL, -- usn, usn_advance, ndfl, nds, insurance, property, transport, land, patent, other
  tax_name VARCHAR(255) NOT NULL,
  
  -- Период
  period VARCHAR(20) NOT NULL, -- "2024-Q1", "2024-01", "2024"
  
  -- Сроки и суммы
  due_date DATE NOT NULL,
  amount BIGINT, -- Сумма в копейках (может быть NULL если ещё не рассчитано)
  calculated_amount BIGINT, -- Рассчитанная сумма
  paid_amount BIGINT NOT NULL DEFAULT 0, -- Оплаченная сумма
  paid_date DATE, -- Дата оплаты
  
  -- Статус
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
  
  -- Связи
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL, -- Связь с платёжным документом
  
  -- Дополнительно
  notes TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tax_payments_company_id ON tax_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_due_date ON tax_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_status ON tax_payments(status);
CREATE INDEX IF NOT EXISTS idx_tax_payments_tax_type ON tax_payments(tax_type);

-- RLS
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view own company tax payments"
  ON tax_payments FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own company tax payments"
  ON tax_payments FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own company tax payments"
  ON tax_payments FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own company tax payments"
  ON tax_payments FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_tax_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tax_payments_updated_at
  BEFORE UPDATE ON tax_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_payments_updated_at();

-- Добавляем tender_id в accounting_documents если ещё нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounting_documents' AND column_name = 'tender_id'
  ) THEN
    ALTER TABLE accounting_documents ADD COLUMN tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL;
    CREATE INDEX idx_accounting_documents_tender_id ON accounting_documents(tender_id);
  END IF;
END $$;

-- Добавляем tender_id в kudir_entries если ещё нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kudir_entries' AND column_name = 'tender_id'
  ) THEN
    ALTER TABLE kudir_entries ADD COLUMN tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL;
    CREATE INDEX idx_kudir_entries_tender_id ON kudir_entries(tender_id);
  END IF;
END $$;
