-- Миграция: Настройки и уведомления для модуля инвесторов
-- Дата: 2024-12-14

-- ============================================
-- Таблица настроек уведомлений
-- ============================================

CREATE TABLE IF NOT EXISTS investor_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_payment_reminders BOOLEAN NOT NULL DEFAULT true,
  email_overdue_alerts BOOLEAN NOT NULL DEFAULT true,
  email_status_changes BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS для настроек
ALTER TABLE investor_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON investor_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON investor_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON investor_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Таблица уведомлений (история отправок)
-- ============================================

CREATE TABLE IF NOT EXISTS investor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'payment_reminder', 'payment_overdue', 'investment_created',
    'investment_received', 'investment_completed', 'status_changed'
  )),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_notifications_user_id ON investor_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_investment_id ON investor_notifications(investment_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_status ON investor_notifications(status);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_scheduled_at ON investor_notifications(scheduled_at);

-- RLS для уведомлений
ALTER TABLE investor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON investor_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON investor_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Расширение таблицы tender_expenses для инвестиций
-- ============================================

-- Добавляем тип источника для процентов по инвестициям
DO $$ 
BEGIN
  -- Проверяем существование constraint и удаляем если есть
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tender_expenses_source_type_check' 
    AND table_name = 'tender_expenses'
  ) THEN
    ALTER TABLE tender_expenses DROP CONSTRAINT tender_expenses_source_type_check;
  END IF;
  
  -- Добавляем новый constraint с investment_interest
  ALTER TABLE tender_expenses ADD CONSTRAINT tender_expenses_source_type_check 
    CHECK (source_type IN ('document', 'transaction', 'manual', 'investment_interest'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not update tender_expenses constraint: %', SQLERRM;
END $$;

-- Добавляем поле metadata если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tender_expenses' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE tender_expenses ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- Комментарии
-- ============================================

COMMENT ON TABLE investor_notification_settings IS 'Настройки email-уведомлений по инвестициям';
COMMENT ON TABLE investor_notifications IS 'История отправленных уведомлений по инвестициям';
COMMENT ON COLUMN investor_notifications.notification_type IS 'Тип уведомления: payment_reminder, payment_overdue, investment_created, investment_received, investment_completed, status_changed';
