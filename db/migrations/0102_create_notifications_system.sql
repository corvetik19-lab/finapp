-- Миграция: Система уведомлений для тендеров
-- Дата: 2025-11-11
-- Описание: Таблицы для уведомлений, настроек и истории

-- =====================================================
-- 1. ТАБЛИЦА УВЕДОМЛЕНИЙ
-- =====================================================

CREATE TABLE IF NOT EXISTS tender_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  
  -- Тип уведомления
  type TEXT NOT NULL CHECK (type IN (
    'deadline_approaching',    -- Приближается срок
    'deadline_passed',         -- Срок прошел
    'stage_changed',           -- Изменился этап
    'assigned',                -- Назначен ответственным
    'comment_added',           -- Добавлен комментарий
    'file_uploaded',           -- Загружен файл
    'status_changed',          -- Изменился статус
    'reminder',                -- Напоминание
    'system'                   -- Системное
  )),
  
  -- Содержание
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,                   -- Ссылка на объект
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Статус
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Приоритет
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,      -- Когда уведомление устаревает
  
  -- Индексы
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX idx_tender_notifications_user ON tender_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_tender_notifications_company ON tender_notifications(company_id, created_at DESC);
CREATE INDEX idx_tender_notifications_tender ON tender_notifications(tender_id) WHERE tender_id IS NOT NULL;
CREATE INDEX idx_tender_notifications_type ON tender_notifications(type, created_at DESC);
CREATE INDEX idx_tender_notifications_unread ON tender_notifications(user_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- 2. НАСТРОЙКИ УВЕДОМЛЕНИЙ
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настройки по типам
  deadline_approaching_enabled BOOLEAN DEFAULT TRUE,
  deadline_approaching_days INTEGER DEFAULT 3,  -- За сколько дней предупреждать
  
  deadline_passed_enabled BOOLEAN DEFAULT TRUE,
  
  stage_changed_enabled BOOLEAN DEFAULT TRUE,
  
  assigned_enabled BOOLEAN DEFAULT TRUE,
  
  comment_added_enabled BOOLEAN DEFAULT TRUE,
  
  file_uploaded_enabled BOOLEAN DEFAULT FALSE,
  
  status_changed_enabled BOOLEAN DEFAULT TRUE,
  
  -- Email уведомления
  email_enabled BOOLEAN DEFAULT FALSE,
  email_frequency TEXT DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly', 'never')),
  
  -- Push уведомления
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один набор настроек на пользователя в компании
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_company ON notification_settings(company_id);

-- =====================================================
-- 3. ИСТОРИЯ ОТПРАВКИ EMAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES tender_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_email_log_user ON notification_email_log(user_id, created_at DESC);
CREATE INDEX idx_notification_email_log_status ON notification_email_log(status, created_at DESC);

-- =====================================================
-- 4. RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS
ALTER TABLE tender_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_email_log ENABLE ROW LEVEL SECURITY;

-- Политики для tender_notifications
CREATE POLICY "Users can view own notifications"
  ON tender_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON tender_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON tender_notifications FOR INSERT
  WITH CHECK (true);  -- Система может создавать уведомления для любых пользователей

CREATE POLICY "Users can delete own notifications"
  ON tender_notifications FOR DELETE
  USING (user_id = auth.uid());

-- Политики для notification_settings
CREATE POLICY "Users can view own settings"
  ON notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON notification_settings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Политики для notification_email_log
CREATE POLICY "Users can view own email log"
  ON notification_email_log FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- 5. ФУНКЦИИ
-- =====================================================

-- Функция для создания уведомления
CREATE OR REPLACE FUNCTION create_tender_notification(
  p_company_id UUID,
  p_user_id UUID,
  p_tender_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_settings RECORD;
BEGIN
  -- Проверяем настройки пользователя
  SELECT * INTO v_settings
  FROM notification_settings
  WHERE company_id = p_company_id AND user_id = p_user_id;
  
  -- Если настроек нет, создаем дефолтные
  IF NOT FOUND THEN
    INSERT INTO notification_settings (company_id, user_id)
    VALUES (p_company_id, p_user_id)
    RETURNING * INTO v_settings;
  END IF;
  
  -- Проверяем, включен ли данный тип уведомлений
  IF (p_type = 'deadline_approaching' AND NOT v_settings.deadline_approaching_enabled) OR
     (p_type = 'deadline_passed' AND NOT v_settings.deadline_passed_enabled) OR
     (p_type = 'stage_changed' AND NOT v_settings.stage_changed_enabled) OR
     (p_type = 'assigned' AND NOT v_settings.assigned_enabled) OR
     (p_type = 'comment_added' AND NOT v_settings.comment_added_enabled) OR
     (p_type = 'file_uploaded' AND NOT v_settings.file_uploaded_enabled) OR
     (p_type = 'status_changed' AND NOT v_settings.status_changed_enabled) THEN
    RETURN NULL;  -- Уведомление отключено
  END IF;
  
  -- Создаем уведомление
  INSERT INTO tender_notifications (
    company_id, user_id, tender_id, type, title, message, link, priority, metadata
  )
  VALUES (
    p_company_id, p_user_id, p_tender_id, p_type, p_title, p_message, p_link, p_priority, p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Функция для пометки уведомления как прочитанного
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tender_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Функция для пометки всех уведомлений как прочитанных
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE tender_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Функция для удаления старых уведомлений
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM tender_notifications
  WHERE (expires_at IS NOT NULL AND expires_at < NOW())
     OR (created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 6. ТРИГГЕРЫ
-- =====================================================

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- =====================================================
-- КОММЕНТАРИИ
-- =====================================================

COMMENT ON TABLE tender_notifications IS 'Уведомления для пользователей о событиях в тендерах';
COMMENT ON TABLE notification_settings IS 'Настройки уведомлений для каждого пользователя';
COMMENT ON TABLE notification_email_log IS 'История отправки email уведомлений';

COMMENT ON FUNCTION create_tender_notification IS 'Создает новое уведомление с проверкой настроек пользователя';
COMMENT ON FUNCTION mark_notification_read IS 'Помечает уведомление как прочитанное';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Помечает все уведомления пользователя как прочитанные';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Удаляет устаревшие уведомления (старше 90 дней)';
