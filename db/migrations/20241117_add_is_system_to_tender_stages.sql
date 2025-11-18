-- Добавляем поле is_system для различения системных и пользовательских этапов
ALTER TABLE tender_stages
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Помечаем все существующие этапы как системные
UPDATE tender_stages
SET is_system = TRUE
WHERE is_system IS NULL OR is_system = FALSE;

-- Добавляем поле is_hidden для скрытия этапов
ALTER TABLE tender_stages
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Комментарии
COMMENT ON COLUMN tender_stages.is_system IS 'Системный этап (нельзя удалить/редактировать)';
COMMENT ON COLUMN tender_stages.is_hidden IS 'Скрытый этап (не отображается на канбан-доске)';
