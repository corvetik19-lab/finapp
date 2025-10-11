-- Smart Notifications System
-- Система умных уведомлений на основе AI анализа

-- Таблица умных уведомлений
CREATE TABLE IF NOT EXISTS smart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'overspend', 'budget_warning', 'missing_transaction', 'upcoming_payment', 'insight', 'recommendation'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'alert', 'success'
  category_id UUID REFERENCES categories(id),
  related_entity_type VARCHAR(50), -- 'transaction', 'budget', 'payment', 'category'
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  action_url TEXT, -- URL для перехода при клике
  metadata JSONB, -- Дополнительные данные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Уведомление теряет актуальность
);

-- Индексы
CREATE INDEX idx_smart_notifications_user_id ON smart_notifications(user_id);
CREATE INDEX idx_smart_notifications_type ON smart_notifications(type);
CREATE INDEX idx_smart_notifications_created_at ON smart_notifications(created_at DESC);
CREATE INDEX idx_smart_notifications_unread ON smart_notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS политики
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY smart_notifications_select_own ON smart_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY smart_notifications_insert_own ON smart_notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY smart_notifications_update_own ON smart_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY smart_notifications_delete_own ON smart_notifications
  FOR DELETE USING (user_id = auth.uid());

-- Настройки уведомлений пользователя
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  overspend_alerts BOOLEAN DEFAULT TRUE,
  budget_warnings BOOLEAN DEFAULT TRUE,
  missing_transaction_reminders BOOLEAN DEFAULT FALSE, -- Более навязчиво, по умолчанию выкл
  upcoming_payment_reminders BOOLEAN DEFAULT TRUE,
  ai_insights BOOLEAN DEFAULT TRUE,
  ai_recommendations BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  notification_frequency VARCHAR(20) DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'disabled'
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- RLS политики
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert_own ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update_own ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Функция для создания дефолтных настроек при регистрации
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автосоздания настроек
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Функция для очистки старых прочитанных уведомлений (>30 дней)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM smart_notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '30 days';
    
  DELETE FROM smart_notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON TABLE smart_notifications IS 'Умные уведомления на основе AI анализа финансовых паттернов';
COMMENT ON TABLE notification_preferences IS 'Настройки уведомлений пользователя';
