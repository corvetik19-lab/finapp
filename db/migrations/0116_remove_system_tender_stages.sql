-- Удаление системных этапов тендеров
-- Теперь все этапы создаются только через настройки

-- Временно отключаем триггер логирования изменений этапов
ALTER TABLE tenders DISABLE TRIGGER tenders_stage_change;

-- Делаем stage_id необязательным
ALTER TABLE tenders ALTER COLUMN stage_id DROP NOT NULL;

-- Обнуляем ссылки на системные этапы в существующих тендерах
UPDATE tenders 
SET stage_id = NULL 
WHERE stage_id IN (SELECT id FROM tender_stages WHERE company_id IS NULL);

-- Включаем триггер обратно
ALTER TABLE tenders ENABLE TRIGGER tenders_stage_change;

-- Удаляем историю переходов по системным этапам
DELETE FROM tender_stage_history 
WHERE from_stage_id IN (SELECT id FROM tender_stages WHERE company_id IS NULL)
   OR to_stage_id IN (SELECT id FROM tender_stages WHERE company_id IS NULL);

-- Теперь удаляем все системные этапы (где company_id IS NULL)
DELETE FROM tender_stages WHERE company_id IS NULL;

-- Комментарий
COMMENT ON TABLE tender_stages IS 'Этапы тендеров (создаются пользователями в настройках)';
