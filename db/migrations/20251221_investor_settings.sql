-- Миграция: Настройки модуля инвесторов
-- Дата: 21.12.2025

-- Таблица настроек уведомлений инвесторов
CREATE TABLE IF NOT EXISTS investor_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email настройки
  email_payment_reminders BOOLEAN DEFAULT true,
  email_overdue_alerts BOOLEAN DEFAULT true,
  email_status_changes BOOLEAN DEFAULT true,
  email_tender_events BOOLEAN DEFAULT true,
  
  -- Telegram настройки
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id TEXT,
  
  -- Сроки напоминаний
  reminder_days_before INTEGER DEFAULT 7,
  
  -- Регулярные отчёты
  weekly_report BOOLEAN DEFAULT false,
  monthly_report BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Таблица настроек по умолчанию для инвестиций
CREATE TABLE IF NOT EXISTS investor_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ставки по умолчанию
  default_interest_rate DECIMAL(5,2) DEFAULT 24.0,
  default_period_days INTEGER DEFAULT 90,
  default_penalty_rate DECIMAL(5,3) DEFAULT 0.1,
  penalty_grace_days INTEGER DEFAULT 3,
  auto_calculate_penalty BOOLEAN DEFAULT true,
  
  -- Гарантии
  default_commission_rate DECIMAL(5,2) DEFAULT 2.5,
  guarantee_reminder_days INTEGER DEFAULT 30,
  auto_renew_reminder BOOLEAN DEFAULT true,
  
  -- Отображение
  show_completed_investments BOOLEAN DEFAULT false,
  default_currency VARCHAR(3) DEFAULT 'RUB',
  date_format VARCHAR(20) DEFAULT 'dd.MM.yyyy',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Таблица истории уведомлений
CREATE TABLE IF NOT EXISTS investor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
  guarantee_id UUID REFERENCES bank_guarantees(id) ON DELETE SET NULL,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'payment_reminder',
    'payment_overdue',
    'investment_created',
    'investment_received',
    'investment_completed',
    'status_changed',
    'guarantee_expiring',
    'tender_won',
    'tender_lost',
    'weekly_report',
    'monthly_report'
  )),
  
  recipient_email TEXT,
  recipient_telegram TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_notifications_user ON investor_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_investment ON investor_notifications(investment_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_status ON investor_notifications(status);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_scheduled ON investor_notifications(scheduled_at);

-- RLS политики
ALTER TABLE investor_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_notifications ENABLE ROW LEVEL SECURITY;

-- Политики для investor_notification_settings
DROP POLICY IF EXISTS "Users can view own notification settings" ON investor_notification_settings;
CREATE POLICY "Users can view own notification settings" ON investor_notification_settings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notification settings" ON investor_notification_settings;
CREATE POLICY "Users can insert own notification settings" ON investor_notification_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification settings" ON investor_notification_settings;
CREATE POLICY "Users can update own notification settings" ON investor_notification_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Политики для investor_defaults
DROP POLICY IF EXISTS "Users can view own defaults" ON investor_defaults;
CREATE POLICY "Users can view own defaults" ON investor_defaults
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own defaults" ON investor_defaults;
CREATE POLICY "Users can insert own defaults" ON investor_defaults
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own defaults" ON investor_defaults;
CREATE POLICY "Users can update own defaults" ON investor_defaults
  FOR UPDATE USING (user_id = auth.uid());

-- Политики для investor_notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON investor_notifications;
CREATE POLICY "Users can view own notifications" ON investor_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notifications" ON investor_notifications;
CREATE POLICY "Users can insert own notifications" ON investor_notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
