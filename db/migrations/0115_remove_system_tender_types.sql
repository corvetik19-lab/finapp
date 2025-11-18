-- Удаление системных типов тендеров
-- Теперь все типы создаются только через настройки

-- Сначала обнуляем ссылки на системные типы в существующих тендерах
UPDATE tenders 
SET type_id = NULL 
WHERE type_id IN (SELECT id FROM tender_types WHERE company_id IS NULL);

-- Теперь удаляем все системные типы (где company_id IS NULL)
DELETE FROM tender_types WHERE company_id IS NULL;

-- Комментарий
COMMENT ON TABLE tender_types IS 'Типы тендеров (создаются пользователями в настройках)';
