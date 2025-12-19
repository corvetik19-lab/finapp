-- ============================================================
-- AI Studio Access Control
-- Управление доступом к Gemini AI Studio
-- ============================================================

-- Таблица разрешений AI Studio
CREATE TABLE IF NOT EXISTS ai_studio_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{"all": true}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ai_studio_access_org ON ai_studio_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_studio_access_active ON ai_studio_access(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE ai_studio_access ENABLE ROW LEVEL SECURITY;

-- Политика: супер-админ может всё
CREATE POLICY "Super admin full access" ON ai_studio_access
  FOR ALL USING (
    auth.email() = 'corvetik1@yandex.ru'
  );

-- Политика: организации видят свой доступ
CREATE POLICY "Organizations view own access" ON ai_studio_access
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_ai_studio_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_studio_access_updated_at
  BEFORE UPDATE ON ai_studio_access
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_studio_access_updated_at();

-- Таблица логов использования AI Studio
CREATE TABLE IF NOT EXISTS ai_studio_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  feature TEXT NOT NULL, -- chat, image, video, audio, document, research
  model TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для логов
CREATE INDEX IF NOT EXISTS idx_ai_studio_logs_user ON ai_studio_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_studio_logs_org ON ai_studio_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_studio_logs_date ON ai_studio_usage_logs(created_at);

-- RLS для логов
ALTER TABLE ai_studio_usage_logs ENABLE ROW LEVEL SECURITY;

-- Супер-админ видит все логи
CREATE POLICY "Super admin view all logs" ON ai_studio_usage_logs
  FOR SELECT USING (
    auth.email() = 'corvetik1@yandex.ru'
  );

-- Пользователи видят свои логи
CREATE POLICY "Users view own logs" ON ai_studio_usage_logs
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Вставка логов для авторизованных
CREATE POLICY "Insert own logs" ON ai_studio_usage_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
