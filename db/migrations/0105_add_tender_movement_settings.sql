-- ============================================================
-- Миграция: Настройки перемещения тендеров
-- Дата: 2025-11-14
-- Описание: Добавление настройки для ограничения перемещения тендеров только вперёд
-- ============================================================

-- Добавляем настройку в tender_notification_settings (расширяем существующую таблицу)
ALTER TABLE tender_notification_settings 
ADD COLUMN IF NOT EXISTS allow_backward_movement boolean DEFAULT false NOT NULL;

-- Комментарий
COMMENT ON COLUMN tender_notification_settings.allow_backward_movement IS 'Разрешить перемещение тендеров назад по этапам (по умолчанию только вперёд)';

-- Устанавливаем для всех существующих пользователей значение по умолчанию
UPDATE tender_notification_settings 
SET allow_backward_movement = false 
WHERE allow_backward_movement IS NULL;
