-- Добавляем поле is_system для различения системных и пользовательских типов тендеров
ALTER TABLE tender_types
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Помечаем существующие системные типы тендеров
UPDATE tender_types
SET is_system = TRUE
WHERE name IN ('ЗМО', 'ФЗ-223', 'ФЗ-44', 'Запрос котировок')
   OR name ILIKE '%зм%'
   OR name ILIKE '%фз%223%'
   OR name ILIKE '%фз%44%'
   OR name ILIKE '%котиров%';

-- Комментарий
COMMENT ON COLUMN tender_types.is_system IS 'Системный тип тендера (нельзя удалить)';
