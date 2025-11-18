-- Привязка существующих тендеров к этапу по умолчанию
-- Все тендеры без этапа получат этап "Анализ и просчёт"

-- Временно отключаем триггер логирования изменений этапов
ALTER TABLE tenders DISABLE TRIGGER tenders_stage_change;

-- Обновляем тендеры без этапа, устанавливаем первый этап "Анализ и просчёт"
UPDATE tenders
SET stage_id = (
  SELECT id FROM tender_stages 
  WHERE name = 'Анализ и просчёт' 
  AND category = 'tender_dept'
  LIMIT 1
)
WHERE stage_id IS NULL;

-- Включаем триггер обратно
ALTER TABLE tenders ENABLE TRIGGER tenders_stage_change;

-- Комментарий
COMMENT ON COLUMN tenders.stage_id IS 'Текущий этап тендера (может быть NULL для новых тендеров)';
