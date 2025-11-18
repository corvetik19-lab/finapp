-- ============================================================
-- Миграция: Таблицы для настроек тендеров
-- Дата: 2025-11-13
-- Описание: Создание таблиц для уведомлений, автоматизации, шаблонов и интеграций
-- ============================================================

-- Таблица настроек уведомлений
CREATE TABLE IF NOT EXISTS tender_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- События
  deadline_reminder boolean DEFAULT true,
  stage_change boolean DEFAULT true,
  new_tender boolean DEFAULT false,
  document_expiry boolean DEFAULT true,
  
  -- Каналы
  email_notifications boolean DEFAULT true,
  telegram_notifications boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Таблица правил автоматизации
CREATE TABLE IF NOT EXISTS tender_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  
  -- Триггер
  trigger_type text NOT NULL, -- 'deadline_passed', 'documents_ready', 'stage_duration'
  trigger_condition jsonb DEFAULT '{}',
  
  -- Действие
  action_type text NOT NULL, -- 'move_stage', 'send_notification', 'assign_user'
  action_params jsonb DEFAULT '{}',
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица шаблонов документов
CREATE TABLE IF NOT EXISTS tender_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL, -- 'application', 'proposal', 'report', 'contract'
  content text DEFAULT '',
  
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица интеграций
CREATE TABLE IF NOT EXISTS tender_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text NOT NULL UNIQUE, -- 'eis', 'email', 'telegram', '1c'
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON tender_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON tender_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_type ON tender_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON tender_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON tender_integrations(is_active) WHERE is_active = true;

-- RLS политики
ALTER TABLE tender_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_integrations ENABLE ROW LEVEL SECURITY;

-- Политики для notification_settings (пользователь видит только свои настройки)
CREATE POLICY "Users can view own notification settings"
  ON tender_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON tender_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON tender_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Политики для automation_rules (все авторизованные пользователи)
CREATE POLICY "Users can view automation rules"
  ON tender_automation_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create automation rules"
  ON tender_automation_rules FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update automation rules"
  ON tender_automation_rules FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete automation rules"
  ON tender_automation_rules FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Политики для templates (все авторизованные пользователи)
CREATE POLICY "Users can view templates"
  ON tender_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create templates"
  ON tender_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update templates"
  ON tender_templates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete templates"
  ON tender_templates FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Политики для integrations (все авторизованные пользователи)
CREATE POLICY "Users can view integrations"
  ON tender_integrations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage integrations"
  ON tender_integrations FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Комментарии
COMMENT ON TABLE tender_notification_settings IS 'Настройки уведомлений пользователей';
COMMENT ON TABLE tender_automation_rules IS 'Правила автоматизации для тендеров';
COMMENT ON TABLE tender_templates IS 'Шаблоны документов для тендеров';
COMMENT ON TABLE tender_integrations IS 'Настройки внешних интеграций';

-- Вставка дефолтных интеграций
INSERT INTO tender_integrations (integration_type, config, is_active) VALUES
  ('eis', '{"api_url": "", "api_key": ""}', false),
  ('email', '{"smtp_host": "", "smtp_port": 587}', true),
  ('telegram', '{"bot_token": "", "chat_id": ""}', false),
  ('1c', '{"api_url": "", "username": "", "password": ""}', false)
ON CONFLICT (integration_type) DO NOTHING;

-- Вставка дефолтных шаблонов
INSERT INTO tender_templates (name, description, template_type, content) VALUES
  ('Заявка на участие', 'Стандартный шаблон заявки для участия в тендере', 'application', ''),
  ('Коммерческое предложение', 'Шаблон для формирования коммерческого предложения', 'proposal', ''),
  ('Отчёт по тендеру', 'Шаблон итогового отчёта по тендеру', 'report', '')
ON CONFLICT DO NOTHING;
