-- Миграция: Модуль Инвесторы
-- Дата: 2024-12-14

-- ============================================
-- 1. Таблица investment_sources - Источники финансирования
-- ============================================

CREATE TABLE IF NOT EXISTS investment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Тип источника
  source_type TEXT NOT NULL CHECK (source_type IN ('bank', 'private', 'fund', 'other')),
  
  -- Информация
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  
  -- Банковские реквизиты
  bank_name TEXT,
  bank_bik TEXT,
  bank_account TEXT,
  correspondent_account TEXT,
  
  -- Юр. данные (для юрлиц)
  inn TEXT,
  kpp TEXT,
  ogrn TEXT,
  legal_address TEXT,
  
  -- Условия по умолчанию
  default_interest_rate DECIMAL(5,2),
  default_period_days INTEGER,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS для investment_sources
ALTER TABLE investment_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sources" ON investment_sources;
CREATE POLICY "Users can manage own sources" ON investment_sources
  FOR ALL USING (user_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investment_sources_user ON investment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_sources_type ON investment_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_investment_sources_active ON investment_sources(is_active);

-- ============================================
-- 2. Таблица investments - Инвестиции
-- ============================================

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Связи
  source_id UUID NOT NULL REFERENCES investment_sources(id) ON DELETE RESTRICT,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  -- Номер и дата
  investment_number TEXT NOT NULL,
  investment_date DATE NOT NULL,
  
  -- Суммы (в копейках)
  requested_amount BIGINT NOT NULL,
  approved_amount BIGINT NOT NULL,
  received_amount BIGINT DEFAULT 0,
  
  -- Условия
  interest_rate DECIMAL(5,2) NOT NULL,
  interest_type TEXT DEFAULT 'annual' CHECK (interest_type IN ('annual', 'monthly', 'fixed')),
  period_days INTEGER NOT NULL,
  due_date DATE NOT NULL,
  
  -- Расчёты (автоматически)
  interest_amount BIGINT DEFAULT 0,
  total_return_amount BIGINT DEFAULT 0,
  returned_principal BIGINT DEFAULT 0,
  returned_interest BIGINT DEFAULT 0,
  
  -- Структура финансирования тендера
  tender_total_cost BIGINT,
  own_funds_amount BIGINT DEFAULT 0,
  investment_share DECIMAL(5,2),
  
  -- Статус
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'requested',
    'approved',
    'received',
    'in_progress',
    'returning',
    'completed',
    'overdue',
    'cancelled'
  )),
  
  -- Документы
  contract_url TEXT,
  
  -- Примечания
  purpose TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS для investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own investments" ON investments;
CREATE POLICY "Users can manage own investments" ON investments
  FOR ALL USING (user_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_source ON investments(source_id);
CREATE INDEX IF NOT EXISTS idx_investments_tender ON investments(tender_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_due_date ON investments(due_date);

-- ============================================
-- 3. Таблица investment_transactions - Движение средств
-- ============================================

CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Тип операции
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'receipt',
    'return_principal',
    'return_interest',
    'penalty',
    'adjustment'
  )),
  
  -- Сумма
  amount BIGINT NOT NULL,
  
  -- Дата и документ
  transaction_date DATE NOT NULL,
  document_number TEXT,
  document_date DATE,
  
  -- Связь с бухгалтерией
  accounting_document_id UUID,
  bank_operation_id UUID,
  
  -- Примечание
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS для investment_transactions
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own inv transactions" ON investment_transactions;
CREATE POLICY "Users can manage own inv transactions" ON investment_transactions
  FOR ALL USING (user_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_inv_transactions_investment ON investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_type ON investment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_date ON investment_transactions(transaction_date);

-- ============================================
-- 4. Таблица investment_returns_schedule - График возвратов
-- ============================================

CREATE TABLE IF NOT EXISTS investment_returns_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Плановый платёж
  payment_number INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  
  -- Суммы
  principal_amount BIGINT DEFAULT 0,
  interest_amount BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL,
  
  -- Факт
  paid_amount BIGINT DEFAULT 0,
  paid_date DATE,
  
  -- Статус
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partial',
    'paid',
    'overdue'
  )),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS для investment_returns_schedule
ALTER TABLE investment_returns_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own returns schedule" ON investment_returns_schedule;
CREATE POLICY "Users can manage own returns schedule" ON investment_returns_schedule
  FOR ALL USING (user_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_returns_schedule_investment ON investment_returns_schedule(investment_id);
CREATE INDEX IF NOT EXISTS idx_returns_schedule_date ON investment_returns_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_returns_schedule_status ON investment_returns_schedule(status);

-- ============================================
-- 5. Таблица investor_access - Доступ инвесторов
-- ============================================

CREATE TABLE IF NOT EXISTS investor_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Инвестор
  source_id UUID NOT NULL REFERENCES investment_sources(id) ON DELETE CASCADE,
  investor_email TEXT NOT NULL,
  investor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Права доступа
  can_view_tender_details BOOLEAN DEFAULT true,
  can_view_documents BOOLEAN DEFAULT false,
  can_view_financials BOOLEAN DEFAULT true,
  can_download_reports BOOLEAN DEFAULT true,
  
  -- Статус
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invite_token TEXT,
  invite_sent_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(source_id, investor_email)
);

-- RLS для investor_access
ALTER TABLE investor_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage investor access" ON investor_access;
CREATE POLICY "Admins can manage investor access" ON investor_access
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Investors can view own access" ON investor_access;
CREATE POLICY "Investors can view own access" ON investor_access
  FOR SELECT USING (investor_user_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_access_user ON investor_access(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_access_source ON investor_access(source_id);
CREATE INDEX IF NOT EXISTS idx_investor_access_investor ON investor_access(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_investor_access_email ON investor_access(investor_email);

-- ============================================
-- 6. Расширение таблицы tenders для инвестиций
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenders' AND column_name = 'has_investment') THEN
    ALTER TABLE tenders ADD COLUMN has_investment BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenders' AND column_name = 'investment_amount') THEN
    ALTER TABLE tenders ADD COLUMN investment_amount BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenders' AND column_name = 'own_funds_amount') THEN
    ALTER TABLE tenders ADD COLUMN own_funds_amount BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenders' AND column_name = 'investment_interest_cost') THEN
    ALTER TABLE tenders ADD COLUMN investment_interest_cost BIGINT DEFAULT 0;
  END IF;
END $$;

-- Индекс для тендеров с инвестициями
CREATE INDEX IF NOT EXISTS idx_tenders_has_investment ON tenders(has_investment) WHERE has_investment = true;

-- ============================================
-- 7. Триггер обновления updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_investors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_investment_sources_updated ON investment_sources;
CREATE TRIGGER trigger_investment_sources_updated
  BEFORE UPDATE ON investment_sources
  FOR EACH ROW EXECUTE FUNCTION update_investors_updated_at();

DROP TRIGGER IF EXISTS trigger_investments_updated ON investments;
CREATE TRIGGER trigger_investments_updated
  BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_investors_updated_at();

DROP TRIGGER IF EXISTS trigger_investor_access_updated ON investor_access;
CREATE TRIGGER trigger_investor_access_updated
  BEFORE UPDATE ON investor_access
  FOR EACH ROW EXECUTE FUNCTION update_investors_updated_at();

-- ============================================
-- Комментарии к таблицам
-- ============================================

COMMENT ON TABLE investment_sources IS 'Источники финансирования (банки, частные инвесторы)';
COMMENT ON TABLE investments IS 'Инвестиции в тендеры';
COMMENT ON TABLE investment_transactions IS 'Движение средств по инвестициям';
COMMENT ON TABLE investment_returns_schedule IS 'График возвратов инвестиций';
COMMENT ON TABLE investor_access IS 'Доступ инвесторов к порталу';
