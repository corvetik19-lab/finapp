-- Расширенный документооборот бухгалтерии
-- Кассовые ордера, авансовые отчёты, доверенности, акты сверки

-- Кассовые ордера (ПКО/РКО)
CREATE TABLE IF NOT EXISTS accounting_cash_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_type VARCHAR(3) NOT NULL CHECK (order_type IN ('pko', 'rko')),
  order_number INTEGER NOT NULL,
  order_date DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500),
  basis VARCHAR(1000),
  appendix VARCHAR(500),
  received_from VARCHAR(500),
  issued_to VARCHAR(500),
  bank_account_id UUID REFERENCES accounting_bank_accounts(id) ON DELETE SET NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  kudir_entry_id UUID REFERENCES kudir_entries(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_orders_company ON accounting_cash_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_orders_date ON accounting_cash_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_cash_orders_type ON accounting_cash_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_cash_orders_tender ON accounting_cash_orders(tender_id);

-- Авансовые отчёты
CREATE TABLE IF NOT EXISTS accounting_advance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_number INTEGER NOT NULL,
  report_date DATE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name VARCHAR(500) NOT NULL,
  employee_position VARCHAR(200),
  department VARCHAR(200),
  purpose VARCHAR(1000),
  advance_amount BIGINT DEFAULT 0,
  spent_amount BIGINT DEFAULT 0,
  balance_amount BIGINT GENERATED ALWAYS AS (advance_amount - spent_amount) STORED,
  overspent_amount BIGINT GENERATED ALWAYS AS (CASE WHEN spent_amount > advance_amount THEN spent_amount - advance_amount ELSE 0 END) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_reports_company ON accounting_advance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_advance_reports_date ON accounting_advance_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_advance_reports_employee ON accounting_advance_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_advance_reports_status ON accounting_advance_reports(status);
CREATE INDEX IF NOT EXISTS idx_advance_reports_tender ON accounting_advance_reports(tender_id);

-- Позиции авансового отчёта
CREATE TABLE IF NOT EXISTS accounting_advance_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES accounting_advance_reports(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  document_date DATE NOT NULL,
  document_number VARCHAR(100),
  document_name VARCHAR(500) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  vat_amount BIGINT DEFAULT 0,
  account_debit VARCHAR(20),
  account_credit VARCHAR(20),
  expense_category VARCHAR(100),
  attachment_path VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_report_items_report ON accounting_advance_report_items(report_id);

-- Доверенности (М-2)
CREATE TABLE IF NOT EXISTS accounting_power_of_attorney (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  poa_number INTEGER NOT NULL,
  poa_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name VARCHAR(500) NOT NULL,
  employee_position VARCHAR(200),
  passport_series VARCHAR(10),
  passport_number VARCHAR(20),
  passport_issued_by VARCHAR(500),
  passport_issued_date DATE,
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500) NOT NULL,
  document_name VARCHAR(500),
  document_number VARCHAR(100),
  document_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  used_at TIMESTAMPTZ,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poa_company ON accounting_power_of_attorney(company_id);
CREATE INDEX IF NOT EXISTS idx_poa_date ON accounting_power_of_attorney(poa_date);
CREATE INDEX IF NOT EXISTS idx_poa_valid_until ON accounting_power_of_attorney(valid_until);
CREATE INDEX IF NOT EXISTS idx_poa_status ON accounting_power_of_attorney(status);
CREATE INDEX IF NOT EXISTS idx_poa_tender ON accounting_power_of_attorney(tender_id);

-- Позиции доверенности (ТМЦ к получению)
CREATE TABLE IF NOT EXISTS accounting_poa_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poa_id UUID NOT NULL REFERENCES accounting_power_of_attorney(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(500) NOT NULL,
  unit VARCHAR(50),
  quantity DECIMAL(15,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poa_items_poa ON accounting_poa_items(poa_id);

-- Акты сверки
CREATE TABLE IF NOT EXISTS accounting_reconciliation_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  act_number INTEGER NOT NULL,
  counterparty_id UUID NOT NULL REFERENCES accounting_counterparties(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance_debit BIGINT DEFAULT 0,
  opening_balance_credit BIGINT DEFAULT 0,
  our_debit BIGINT DEFAULT 0,
  our_credit BIGINT DEFAULT 0,
  their_debit BIGINT DEFAULT 0,
  their_credit BIGINT DEFAULT 0,
  closing_balance_debit BIGINT DEFAULT 0,
  closing_balance_credit BIGINT DEFAULT 0,
  discrepancy BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'disputed')),
  our_signed_by VARCHAR(500),
  our_signed_at TIMESTAMPTZ,
  their_signed_by VARCHAR(500),
  their_signed_at TIMESTAMPTZ,
  dispute_comment TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_company ON accounting_reconciliation_acts(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_counterparty ON accounting_reconciliation_acts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_period ON accounting_reconciliation_acts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON accounting_reconciliation_acts(status);

-- Операции в акте сверки
CREATE TABLE IF NOT EXISTS accounting_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES accounting_reconciliation_acts(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  document_type VARCHAR(50),
  document_number VARCHAR(100),
  document_date DATE,
  description VARCHAR(500),
  our_debit BIGINT DEFAULT 0,
  our_credit BIGINT DEFAULT 0,
  their_debit BIGINT DEFAULT 0,
  their_credit BIGINT DEFAULT 0,
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_items_act ON accounting_reconciliation_items(act_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_date ON accounting_reconciliation_items(operation_date);

-- Шаблоны документов
CREATE TABLE IF NOT EXISTS accounting_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_company ON accounting_document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON accounting_document_templates(document_type);

-- RLS policies
ALTER TABLE accounting_cash_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_advance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_advance_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_power_of_attorney ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_poa_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_reconciliation_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_document_templates ENABLE ROW LEVEL SECURITY;

-- RLS для кассовых ордеров
CREATE POLICY "Users can view cash orders of their company"
  ON accounting_cash_orders FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert cash orders of their company"
  ON accounting_cash_orders FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update cash orders of their company"
  ON accounting_cash_orders FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete cash orders of their company"
  ON accounting_cash_orders FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для авансовых отчётов
CREATE POLICY "Users can view advance reports of their company"
  ON accounting_advance_reports FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert advance reports of their company"
  ON accounting_advance_reports FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update advance reports of their company"
  ON accounting_advance_reports FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete advance reports of their company"
  ON accounting_advance_reports FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для позиций авансовых отчётов
CREATE POLICY "Users can manage advance report items"
  ON accounting_advance_report_items FOR ALL
  USING (report_id IN (
    SELECT ar.id FROM accounting_advance_reports ar
    WHERE ar.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для доверенностей
CREATE POLICY "Users can view POA of their company"
  ON accounting_power_of_attorney FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert POA of their company"
  ON accounting_power_of_attorney FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update POA of their company"
  ON accounting_power_of_attorney FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete POA of their company"
  ON accounting_power_of_attorney FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для позиций доверенностей
CREATE POLICY "Users can manage POA items"
  ON accounting_poa_items FOR ALL
  USING (poa_id IN (
    SELECT poa.id FROM accounting_power_of_attorney poa
    WHERE poa.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для актов сверки
CREATE POLICY "Users can view reconciliation acts of their company"
  ON accounting_reconciliation_acts FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert reconciliation acts of their company"
  ON accounting_reconciliation_acts FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update reconciliation acts of their company"
  ON accounting_reconciliation_acts FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete reconciliation acts of their company"
  ON accounting_reconciliation_acts FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для операций в актах сверки
CREATE POLICY "Users can manage reconciliation items"
  ON accounting_reconciliation_items FOR ALL
  USING (act_id IN (
    SELECT ra.id FROM accounting_reconciliation_acts ra
    WHERE ra.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для шаблонов документов
CREATE POLICY "Users can view templates of their company"
  ON accounting_document_templates FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert templates of their company"
  ON accounting_document_templates FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update templates of their company"
  ON accounting_document_templates FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete templates of their company"
  ON accounting_document_templates FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Triggers для updated_at
CREATE OR REPLACE FUNCTION update_accounting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cash_orders_updated_at
  BEFORE UPDATE ON accounting_cash_orders
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_advance_reports_updated_at
  BEFORE UPDATE ON accounting_advance_reports
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_reconciliation_acts_updated_at
  BEFORE UPDATE ON accounting_reconciliation_acts
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON accounting_document_templates
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();
