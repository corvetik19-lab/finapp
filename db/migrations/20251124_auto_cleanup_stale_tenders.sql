-- Миграция: Автоматическое ПОЛНОЕ удаление устаревших тендеров (hard delete)
-- Тендеры на предконтрактных этапах (tender_dept), у которых срок подачи истёк более 30 дней назад,
-- ПОЛНОСТЬЮ удаляются из базы данных БЕЗ ВОЗМОЖНОСТИ ВОССТАНОВЛЕНИЯ.

-- Функция для очистки устаревших тендеров
CREATE OR REPLACE FUNCTION cleanup_stale_tenders(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
    deleted_count INTEGER,
    deleted_ids UUID[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Находим и ПОЛНОСТЬЮ удаляем тендеры:
    -- 1. Которые находятся на этапах категории 'tender_dept' (предконтрактные этапы)
    -- 2. У которых срок подачи (submission_deadline) истёк более N дней назад
    -- 3. Которые ещё не удалены (deleted_at IS NULL)
    
    WITH stale_tenders AS (
        SELECT t.id
        FROM tenders t
        JOIN tender_stages ts ON ts.id = t.stage_id
        WHERE ts.category = 'tender_dept'
          AND t.submission_deadline IS NOT NULL
          AND t.submission_deadline < NOW() - (days_threshold || ' days')::INTERVAL
          AND t.deleted_at IS NULL
    ),
    deleted AS (
        DELETE FROM tenders
        WHERE id IN (SELECT id FROM stale_tenders)
        RETURNING id
    )
    SELECT ARRAY_AGG(id), COUNT(*)::INTEGER
    INTO v_deleted_ids, v_count
    FROM deleted;
    
    -- Возвращаем результат
    RETURN QUERY SELECT COALESCE(v_count, 0), COALESCE(v_deleted_ids, ARRAY[]::UUID[]);
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION cleanup_stale_tenders(INTEGER) IS 
'ПОЛНОСТЬЮ удаляет (hard delete) тендеры на предконтрактных этапах, у которых срок подачи истёк более N дней назад. По умолчанию N=30. ВНИМАНИЕ: данные невозможно восстановить!';

-- Даём права на выполнение функции сервисной роли
GRANT EXECUTE ON FUNCTION cleanup_stale_tenders(INTEGER) TO service_role;
