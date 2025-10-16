-- Расширение notification_preferences для расписания и Telegram
-- Позволяет пользователям настраивать время получения уведомлений и канал доставки

-- Добавляем поля для расписания
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS schedule_time TIME DEFAULT '09:00:00', -- Время отправки уведомлений
ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- Дни недели (1=пн, 7=вс)
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Комментарии
COMMENT ON COLUMN notification_preferences.schedule_enabled IS 'Включено ли расписание уведомлений';
COMMENT ON COLUMN notification_preferences.schedule_time IS 'Время отправки уведомлений (локальное)';
COMMENT ON COLUMN notification_preferences.schedule_days IS 'Дни недели для отправки (1=пн, 7=вс)';
COMMENT ON COLUMN notification_preferences.telegram_enabled IS 'Отправлять ли уведомления в Telegram';
COMMENT ON COLUMN notification_preferences.telegram_username IS 'Telegram username для отображения';

-- Функция для проверки, должны ли отправляться уведомления сейчас
CREATE OR REPLACE FUNCTION should_send_notifications(
  p_schedule_enabled BOOLEAN,
  p_schedule_time TIME,
  p_schedule_days INTEGER[],
  p_quiet_hours_start TIME,
  p_quiet_hours_end TIME,
  p_current_time TIME DEFAULT LOCALTIME,
  p_current_day INTEGER DEFAULT EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Если расписание выключено, не отправляем
  IF NOT p_schedule_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем день недели
  IF NOT p_current_day = ANY(p_schedule_days) THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем тихие часы
  IF p_quiet_hours_start IS NOT NULL AND p_quiet_hours_end IS NOT NULL THEN
    -- Обрабатываем случай, когда тихие часы переходят через полночь
    IF p_quiet_hours_start < p_quiet_hours_end THEN
      IF p_current_time >= p_quiet_hours_start AND p_current_time < p_quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    ELSE
      IF p_current_time >= p_quiet_hours_start OR p_current_time < p_quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  -- Проверяем время (с допуском ±30 минут от schedule_time)
  IF ABS(EXTRACT(EPOCH FROM (p_current_time - p_schedule_time))) <= 1800 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION should_send_notifications IS 'Проверяет, должны ли отправляться уведомления в данный момент';

-- Обновляем существующие записи (устанавливаем дефолтные значения)
UPDATE notification_preferences
SET 
  schedule_enabled = TRUE,
  schedule_time = '09:00:00',
  schedule_days = ARRAY[1,2,3,4,5,6,7],
  telegram_enabled = CASE 
    WHEN telegram_chat_id IS NOT NULL THEN TRUE 
    ELSE FALSE 
  END
WHERE schedule_enabled IS NULL;
