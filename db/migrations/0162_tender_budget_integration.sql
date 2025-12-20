-- Глубокая интеграция бухгалтерии с тендерами
-- Бюджеты, этапы оплаты, обеспечение контрактов

-- Бюджет тендера (план доходов/расходов)
CREATE TABLE IF NOT EXISTS tender_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  -- Плановые доходы
  planned_revenue BIGINT DEFAULT 0,
  
  -- Плановые расходы по категориям
  planned_materials BIGINT DEFAULT 0,
  planned_labor BIGINT DEFAULT 0,
  planned_subcontractors BIGINT DEFAULT 0,
  planned_transport BIGINT DEFAULT 0,
  planned_overhead BIGINT DEFAULT 0,
  planned_other BIGINT DEFAULT 0,
  planned_total_expense BIGINT GENERATED ALWAYS AS (
    planned_materials + planned_labor + planned_subcontractors + 
    planned_transport + planned_overhead + planned_other
  ) STORED,
  
  -- Плановая прибыль и маржа
  planned_profit BIGINT GENERATED ALWAYS AS (planned_revenue - (
    planned_materials + planned_labor + planned_subcontractors + 
    planned_transport + planned_overhead + planned_other
  )) STORED,
  
  -- Фактические показатели (обновляются автоматически)
  actual_revenue BIGINT DEFAULT 0,
  actual_expense BIGINT DEFAULT 0,
  actual_profit BIGINT GENERATED ALWAYS AS (actual_revenue - actual_expense) STORED,
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tender_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_budgets_company ON tender_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_tender_budgets_tender ON tender_budgets(tender_id);

-- Детальные статьи бюджета
CREATE TABLE IF NOT EXISTS tender_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES tender_budgets(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'materials', 'labor', 'subcontractors', 'transport', 'overhead', 'other'
  )),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  planned_amount BIGINT NOT NULL DEFAULT 0,
  actual_amount BIGINT DEFAULT 0,
  unit VARCHAR(50),
  quantity DECIMAL(15,4),
  price_per_unit BIGINT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON tender_budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON tender_budget_items(category);

-- Этапы оплаты контракта
CREATE TABLE IF NOT EXISTS tender_payment_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  stage_number INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Сумма и процент
  amount BIGINT NOT NULL,
  percentage DECIMAL(5,2),
  
  -- Условия
  condition_type VARCHAR(50) CHECK (condition_type IN (
    'advance', 'milestone', 'delivery', 'acceptance', 'final'
  )),
  condition_description TEXT,
  
  -- Даты
  planned_date DATE,
  actual_date DATE,
  due_date DATE,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'invoiced', 'partial', 'paid', 'overdue'
  )),
  
  -- Связь с документами
  invoice_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  paid_amount BIGINT DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_stages_company ON tender_payment_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_stages_tender ON tender_payment_stages(tender_id);
CREATE INDEX IF NOT EXISTS idx_payment_stages_status ON tender_payment_stages(status);
CREATE INDEX IF NOT EXISTS idx_payment_stages_planned ON tender_payment_stages(planned_date);

-- Обеспечение контракта (гарантии, депозиты)
CREATE TABLE IF NOT EXISTS tender_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  guarantee_type VARCHAR(50) NOT NULL CHECK (guarantee_type IN (
    'bid', 'contract', 'advance', 'warranty', 'deposit'
  )),
  guarantee_form VARCHAR(50) CHECK (guarantee_form IN (
    'bank_guarantee', 'deposit', 'insurance', 'retention'
  )),
  
  amount BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Банковская гарантия
  bank_name VARCHAR(200),
  guarantee_number VARCHAR(100),
  
  -- Даты
  issue_date DATE,
  valid_from DATE,
  valid_until DATE NOT NULL,
  return_date DATE,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'expired', 'returned', 'claimed'
  )),
  
  -- Связь со счётом
  bank_account_id UUID REFERENCES accounting_bank_accounts(id) ON DELETE SET NULL,
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guarantees_company ON tender_guarantees(company_id);
CREATE INDEX IF NOT EXISTS idx_guarantees_tender ON tender_guarantees(tender_id);
CREATE INDEX IF NOT EXISTS idx_guarantees_type ON tender_guarantees(guarantee_type);
CREATE INDEX IF NOT EXISTS idx_guarantees_status ON tender_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_guarantees_valid_until ON tender_guarantees(valid_until);

-- Пени и штрафы
CREATE TABLE IF NOT EXISTS tender_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  penalty_type VARCHAR(50) NOT NULL CHECK (penalty_type IN (
    'delay', 'quality', 'breach', 'other'
  )),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('income', 'expense')),
  
  amount BIGINT NOT NULL,
  calculated_amount BIGINT,
  
  -- Основание
  basis VARCHAR(500),
  calculation_method TEXT,
  
  -- Даты
  accrual_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'accrued' CHECK (status IN (
    'accrued', 'disputed', 'paid', 'written_off'
  )),
  
  -- Связь с документами
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalties_company ON tender_penalties(company_id);
CREATE INDEX IF NOT EXISTS idx_penalties_tender ON tender_penalties(tender_id);
CREATE INDEX IF NOT EXISTS idx_penalties_type ON tender_penalties(penalty_type);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON tender_penalties(status);

-- Субподрядчики по тендеру
CREATE TABLE IF NOT EXISTS tender_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  
  name VARCHAR(500) NOT NULL,
  inn VARCHAR(12),
  
  -- Объём работ
  work_description TEXT,
  contract_amount BIGINT,
  paid_amount BIGINT DEFAULT 0,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'completed', 'terminated'
  )),
  
  -- Договор
  contract_number VARCHAR(100),
  contract_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcontractors_company ON tender_subcontractors(company_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_tender ON tender_subcontractors(tender_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_counterparty ON tender_subcontractors(counterparty_id);

-- RLS policies
ALTER TABLE tender_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_payment_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_subcontractors ENABLE ROW LEVEL SECURITY;

-- RLS для бюджетов
CREATE POLICY "Users can manage tender budgets of their company"
  ON tender_budgets FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для статей бюджета
CREATE POLICY "Users can manage budget items"
  ON tender_budget_items FOR ALL
  USING (budget_id IN (
    SELECT b.id FROM tender_budgets b
    WHERE b.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для этапов оплаты
CREATE POLICY "Users can manage payment stages of their company"
  ON tender_payment_stages FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для гарантий
CREATE POLICY "Users can manage guarantees of their company"
  ON tender_guarantees FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для пеней
CREATE POLICY "Users can manage penalties of their company"
  ON tender_penalties FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для субподрядчиков
CREATE POLICY "Users can manage subcontractors of their company"
  ON tender_subcontractors FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Triggers для updated_at
CREATE TRIGGER update_tender_budgets_updated_at
  BEFORE UPDATE ON tender_budgets
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_payment_stages_updated_at
  BEFORE UPDATE ON tender_payment_stages
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_guarantees_updated_at
  BEFORE UPDATE ON tender_guarantees
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();
