-- Миграция: Таблицы для расширенного модуля поставщиков
-- Дата: 2024-12-20

-- =====================================================
-- Таблица импортов поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  column_mapping JSONB,
  options JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для supplier_imports
ALTER TABLE supplier_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company imports" ON supplier_imports
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create imports for own company" ON supplier_imports
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own company imports" ON supplier_imports
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- Таблица сохранённых фильтров поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для supplier_saved_filters
ALTER TABLE supplier_saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and shared filters" ON supplier_saved_filters
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (is_shared = true AND company_id IN (
      SELECT company_id FROM organization_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own filters" ON supplier_saved_filters
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- Таблица верификации поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('dadata', 'rnp', 'arbitr', 'fssp', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'warning', 'error')),
  result JSONB,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для supplier_verifications
ALTER TABLE supplier_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verifications of own suppliers" ON supplier_verifications
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create verifications for own suppliers" ON supplier_verifications
  FOR INSERT WITH CHECK (
    supplier_id IN (
      SELECT id FROM suppliers WHERE company_id IN (
        SELECT company_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- Таблица позиций прайс-листов
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_pricelist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricelist_id UUID NOT NULL REFERENCES supplier_pricelists(id) ON DELETE CASCADE,
  article TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'шт',
  price BIGINT NOT NULL,
  old_price BIGINT,
  quantity INTEGER,
  min_order INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для supplier_pricelist_items
ALTER TABLE supplier_pricelist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pricelist items of own suppliers" ON supplier_pricelist_items
  FOR SELECT USING (
    pricelist_id IN (
      SELECT id FROM supplier_pricelists WHERE supplier_id IN (
        SELECT id FROM suppliers WHERE company_id IN (
          SELECT company_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage pricelist items of own suppliers" ON supplier_pricelist_items
  FOR ALL USING (
    pricelist_id IN (
      SELECT id FROM supplier_pricelists WHERE supplier_id IN (
        SELECT id FROM suppliers WHERE company_id IN (
          SELECT company_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- Расширение таблицы supplier_tenders
-- =====================================================

ALTER TABLE supplier_tenders 
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invitation_method TEXT CHECK (invitation_method IN ('email', 'phone', 'platform')),
  ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_amount BIGINT,
  ADD COLUMN IF NOT EXISTS offer_currency TEXT DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS offer_delivery_days INTEGER,
  ADD COLUMN IF NOT EXISTS offer_payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS offer_warranty_months INTEGER,
  ADD COLUMN IF NOT EXISTS offer_documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evaluation_score INTEGER,
  ADD COLUMN IF NOT EXISTS evaluation_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- Таблица email-рассылок
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id TEXT,
  recipient_filter JSONB,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для supplier_email_campaigns
ALTER TABLE supplier_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company campaigns" ON supplier_email_campaigns
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own company campaigns" ON supplier_email_campaigns
  FOR ALL USING (company_id IN (
    SELECT company_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- Таблица получателей рассылки
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES supplier_email_campaigns(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  contact_id UUID REFERENCES supplier_contacts(id),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error TEXT
);

-- RLS для supplier_email_recipients
ALTER TABLE supplier_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipients of own campaigns" ON supplier_email_recipients
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM supplier_email_campaigns WHERE company_id IN (
        SELECT company_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- Индексы для производительности
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_company_status ON suppliers(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_company_category ON suppliers(company_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_inn ON suppliers(inn) WHERE inn IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_imports_company ON supplier_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_imports_status ON supplier_imports(status);
CREATE INDEX IF NOT EXISTS idx_supplier_verifications_supplier ON supplier_verifications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelist_items_pricelist ON supplier_pricelist_items(pricelist_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tenders_supplier ON supplier_tenders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tenders_tender ON supplier_tenders(tender_id);
CREATE INDEX IF NOT EXISTS idx_supplier_email_campaigns_company ON supplier_email_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_email_recipients_campaign ON supplier_email_recipients(campaign_id);

-- Full-text search индекс для поставщиков
CREATE INDEX IF NOT EXISTS idx_suppliers_search ON suppliers 
  USING GIN(to_tsvector('russian', COALESCE(name, '') || ' ' || COALESCE(short_name, '') || ' ' || COALESCE(inn, '')));
