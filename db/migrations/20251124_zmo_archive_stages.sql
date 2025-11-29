-- Перемещение архивных этапов ЗМО в категорию 'archive'
-- Эти этапы будут отображаться в отдельной секции "ЗМО: Архив"

UPDATE tender_stages
SET category = 'archive',
    is_system = true
WHERE name IN (
    'ЗМО:не участвуем',
    'ЗМО:Не прошла проверку',
    'ЗМО:Не подано',
    'ЗМО:Проиграли',
    'ЗМО: Договор не заключен'
);

-- Комментарий
COMMENT ON TABLE tender_stages IS 'Этапы тендеров: категории tender_dept (предконтрактные), realization (реализация), archive (архив)';
