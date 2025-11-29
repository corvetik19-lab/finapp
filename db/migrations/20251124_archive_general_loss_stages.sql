-- Перемещение стандартных завершающих этапов в категорию 'archive'
-- Они будут отображаться в общей секции "Архив" и удалены из шаблонов

UPDATE tender_stages
SET category = 'archive',
    is_system = true
WHERE name ILIKE 'Не участвуем'
   OR name ILIKE 'Не прошл% проверку'
   OR name ILIKE 'Не подано'
   OR name ILIKE 'Проиграли'
   OR name ILIKE 'Договор не заключен';

-- Удаление этих этапов из всех шаблонов
DELETE FROM tender_stage_template_items
WHERE stage_id IN (
    SELECT id FROM tender_stages 
    WHERE category = 'archive' 
    AND (
        name ILIKE 'Не участвуем'
        OR name ILIKE 'Не прошл% проверку'
        OR name ILIKE 'Не подано'
        OR name ILIKE 'Проиграли'
        OR name ILIKE 'Договор не заключен'
    )
);
