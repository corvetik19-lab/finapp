-- 1. Перемещение архивных этапов ЗМО в категорию 'archive' (с использованием нестрогого поиска)
UPDATE tender_stages
SET category = 'archive',
    is_system = true
WHERE name ILIKE 'ЗМО:%не участвуем%'
   OR name ILIKE 'ЗМО:%не прошла проверку%'
   OR name ILIKE 'ЗМО:%не подано%'
   OR name ILIKE 'ЗМО:%проиграли%'
   OR name ILIKE 'ЗМО:%договор не заключен%';

-- 2. Удаление этих этапов из шаблона 'ЗМО'
-- Они останутся в системе как архивные, но не будут частью основного списка этапов шаблона
DELETE FROM tender_stage_template_items
WHERE template_id IN (SELECT id FROM tender_stage_templates WHERE name = 'ЗМО')
  AND stage_id IN (
    SELECT id FROM tender_stages 
    WHERE category = 'archive' 
    AND name LIKE 'ЗМО:%'
  );
