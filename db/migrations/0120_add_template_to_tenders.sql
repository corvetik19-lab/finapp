-- Добавление поля template_id в таблицу tenders
-- Позволяет связать тендер с шаблоном этапов

ALTER TABLE tenders 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES tender_stage_templates(id) ON DELETE SET NULL;

-- Индекс для быстрой фильтрации по шаблону
CREATE INDEX IF NOT EXISTS idx_tenders_template ON tenders(template_id);

-- Комментарий
COMMENT ON COLUMN tenders.template_id IS 'Шаблон этапов, использованный при создании тендера (например ФЗ-44, ЗМО)';
