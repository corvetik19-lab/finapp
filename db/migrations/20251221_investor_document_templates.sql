-- Фаза 5: Документооборот для модуля инвесторов
-- Шаблоны договоров и актов сверки

-- Таблица шаблонов документов
CREATE TABLE IF NOT EXISTS investor_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('loan_agreement', 'reconciliation_act', 'investor_report', 'guarantee_contract', 'custom')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_contract_templates_user ON investor_contract_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_contract_templates_type ON investor_contract_templates(template_type);

-- RLS
ALTER TABLE investor_contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_contract_templates_select ON investor_contract_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY investor_contract_templates_insert ON investor_contract_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY investor_contract_templates_update ON investor_contract_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY investor_contract_templates_delete ON investor_contract_templates
  FOR DELETE USING (user_id = auth.uid());

-- Таблица сгенерированных документов
CREATE TABLE IF NOT EXISTS investor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
  template_id UUID REFERENCES investor_contract_templates(id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  file_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'cancelled')),
  signed_at TIMESTAMPTZ,
  signed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_documents_user ON investor_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_investment ON investor_documents(investment_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_status ON investor_documents(status);

-- RLS
ALTER TABLE investor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_documents_select ON investor_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY investor_documents_insert ON investor_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY investor_documents_update ON investor_documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY investor_documents_delete ON investor_documents
  FOR DELETE USING (user_id = auth.uid());

-- Таблица актов сверки
CREATE TABLE IF NOT EXISTS investor_reconciliation_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  act_number VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance BIGINT DEFAULT 0,
  total_invested BIGINT DEFAULT 0,
  total_returned BIGINT DEFAULT 0,
  closing_balance BIGINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'disputed')),
  investor_confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_reconciliation_user ON investor_reconciliation_acts(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_reconciliation_investment ON investor_reconciliation_acts(investment_id);
CREATE INDEX IF NOT EXISTS idx_investor_reconciliation_period ON investor_reconciliation_acts(period_start, period_end);

-- RLS
ALTER TABLE investor_reconciliation_acts ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_reconciliation_select ON investor_reconciliation_acts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY investor_reconciliation_insert ON investor_reconciliation_acts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY investor_reconciliation_update ON investor_reconciliation_acts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY investor_reconciliation_delete ON investor_reconciliation_acts
  FOR DELETE USING (user_id = auth.uid());
