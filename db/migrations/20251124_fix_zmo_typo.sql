-- Исправление для этапа 'ЗМО: Не прошло проверку'
-- В предыдущей миграции искали '...прошлА...', а в базе '...прошлО...'

UPDATE tender_stages
SET category = 'archive',
    is_system = true
WHERE name ILIKE 'ЗМО:%не прошл% проверку%';

-- Удаление из шаблонов
DELETE FROM tender_stage_template_items
WHERE stage_id IN (
    SELECT id FROM tender_stages 
    WHERE category = 'archive' 
    AND name ILIKE 'ЗМО:%не прошл% проверку%'
);
