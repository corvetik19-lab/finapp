-- =====================================================
-- Расширение модуля Инвесторы
-- Дата: 21 декабря 2025
-- =====================================================

-- =====================================================
-- 1. Расширение таблицы investments
-- =====================================================

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  funding_stage TEXT CHECK (funding_stage IS NULL OR funding_stage IN (
    'application', 'security', 'execution', 'warranty'
  ));

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  tender_stage_id UUID REFERENCES tender_stages(id) ON DELETE SET NULL;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  target_expense_category TEXT;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  penalty_rate DECIMAL(5,2) DEFAULT 0.1;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  penalty_grace_days INTEGER DEFAULT 3;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  accumulated_penalty BIGINT DEFAULT 0;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  early_return_allowed BOOLEAN DEFAULT true;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  early_return_penalty_rate DECIMAL(5,2);

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  collateral_description TEXT;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  collateral_value BIGINT;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  guarantor_id UUID REFERENCES investment_sources(id) ON DELETE SET NULL;

ALTER TABLE investments ADD COLUMN IF NOT EXISTS 
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

CREATE INDEX IF NOT EXISTS idx_investments_funding_stage ON investments(funding_stage) WHERE funding_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investments_tender_stage ON investments(tender_stage_id) WHERE tender_stage_id IS NOT NULL;

-- =====================================================
-- 2. Расширение таблицы investment_sources
-- =====================================================

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100);

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  total_invested BIGINT DEFAULT 0;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  total_returned BIGINT DEFAULT 0;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  average_delay_days INTEGER DEFAULT 0;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  preferred_tender_types TEXT[];

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  min_investment_amount BIGINT;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  max_investment_amount BIGINT;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  available_credit_limit BIGINT;

ALTER TABLE investment_sources ADD COLUMN IF NOT EXISTS 
  last_interaction_at TIMESTAMPTZ;

-- =====================================================
-- 3. Таблица связи инвестиций с расходами
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_expense_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES tender_expenses(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investment_id, expense_id)
);

ALTER TABLE investment_expense_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own expense links" ON investment_expense_links;
CREATE POLICY "Users can manage own expense links" ON investment_expense_links
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_inv_expense_links_investment ON investment_expense_links(investment_id);
CREATE INDEX IF NOT EXISTS idx_inv_expense_links_expense ON investment_expense_links(expense_id);

-- =====================================================
-- 4. Таблица банковских гарантий
-- =====================================================

CREATE TABLE IF NOT EXISTS bank_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  source_id UUID REFERENCES investment_sources(id) ON DELETE SET NULL,
  
  guarantee_type TEXT NOT NULL CHECK (guarantee_type IN (
    'application', 'contract', 'warranty', 'advance'
  )),
  
  guarantee_number TEXT,
  issue_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  guarantee_amount BIGINT NOT NULL,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2),
  
  status TEXT DEFAULT 'active' CHECK (status IN (
    'draft', 'pending', 'active', 'expired', 'claimed', 'returned'
  )),
  
  bank_name TEXT,
  bank_bik TEXT,
  document_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bank_guarantees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own guarantees" ON bank_guarantees;
CREATE POLICY "Users can manage own guarantees" ON bank_guarantees
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bank_guarantees_user ON bank_guarantees(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_company ON bank_guarantees(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_tender ON bank_guarantees(tender_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_type ON bank_guarantees(guarantee_type);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_status ON bank_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_end_date ON bank_guarantees(end_date);

DROP TRIGGER IF EXISTS trigger_bank_guarantees_updated ON bank_guarantees;
CREATE TRIGGER trigger_bank_guarantees_updated
  BEFORE UPDATE ON bank_guarantees
  FOR EACH ROW EXECUTE FUNCTION update_investors_updated_at();
