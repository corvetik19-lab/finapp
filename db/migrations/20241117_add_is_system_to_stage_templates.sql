-- Добавляем поле is_system для различения системных и пользовательских шаблонов
ALTER TABLE tender_stage_templates
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Помечаем существующий шаблон ЗМО как системный (если он есть)
UPDATE tender_stage_templates
SET is_system = TRUE
WHERE name = 'ЗМО' OR name ILIKE '%зм%';

-- Комментарий
COMMENT ON COLUMN tender_stage_templates.is_system IS 'Системный шаблон (нельзя удалить/переименовать, но можно редактировать этапы)';
