-- Создание системы шаблонов этапов для тендеров
-- Позволяет создавать наборы этапов (например "ЗМО", "ФЗ-44") 
-- и применять их к тендерам

-- Таблица шаблонов наборов этапов
CREATE TABLE IF NOT EXISTS tender_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Связь шаблона с этапами (упорядоченный список этапов)
CREATE TABLE IF NOT EXISTS tender_stage_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES tender_stage_templates(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES tender_stages(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, stage_id),
  UNIQUE(template_id, order_index)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_stage_templates_company ON tender_stage_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_stage_template_items_template ON tender_stage_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_stage_template_items_order ON tender_stage_template_items(template_id, order_index);

-- RLS политики для шаблонов
ALTER TABLE tender_stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_stage_template_items ENABLE ROW LEVEL SECURITY;

-- Политики для tender_stage_templates
DROP POLICY IF EXISTS "Company members can view their templates" ON tender_stage_templates;
CREATE POLICY "Company members can view their templates"
  ON tender_stage_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Company members can insert templates" ON tender_stage_templates;
CREATE POLICY "Company members can insert templates"
  ON tender_stage_templates FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Company members can update their templates" ON tender_stage_templates;
CREATE POLICY "Company members can update their templates"
  ON tender_stage_templates FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Company members can delete their templates" ON tender_stage_templates;
CREATE POLICY "Company members can delete their templates"
  ON tender_stage_templates FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Политики для tender_stage_template_items
DROP POLICY IF EXISTS "Company members can view template items" ON tender_stage_template_items;
CREATE POLICY "Company members can view template items"
  ON tender_stage_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM tender_stage_templates 
      WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Company members can insert template items" ON tender_stage_template_items;
CREATE POLICY "Company members can insert template items"
  ON tender_stage_template_items FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM tender_stage_templates 
      WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Company members can update template items" ON tender_stage_template_items;
CREATE POLICY "Company members can update template items"
  ON tender_stage_template_items FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM tender_stage_templates 
      WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Company members can delete template items" ON tender_stage_template_items;
CREATE POLICY "Company members can delete template items"
  ON tender_stage_template_items FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM tender_stage_templates 
      WHERE company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_tender_stage_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tender_stage_templates_updated_at ON tender_stage_templates;
CREATE TRIGGER tender_stage_templates_updated_at
  BEFORE UPDATE ON tender_stage_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_stage_templates_updated_at();

-- Комментарии
COMMENT ON TABLE tender_stage_templates IS 'Шаблоны наборов этапов для тендеров (например ЗМО, ФЗ-44)';
COMMENT ON TABLE tender_stage_template_items IS 'Этапы в составе шаблона (упорядоченный список)';
