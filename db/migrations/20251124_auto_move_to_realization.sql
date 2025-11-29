-- Функция для автоматического перевода тендера в реализацию
-- при достижении этапа "Договор подписан" или "ЗМО: Договор подписан"

CREATE OR REPLACE FUNCTION auto_move_to_realization()
RETURNS TRIGGER AS $$
DECLARE
    v_stage_name TEXT;
    v_first_realization_stage_id UUID;
BEGIN
    -- Проверяем только при изменении stage_id
    IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) OR TG_OP = 'INSERT' THEN
        
        -- Получаем название нового этапа
        SELECT name INTO v_stage_name
        FROM tender_stages
        WHERE id = NEW.stage_id;
        
        -- Проверяем, является ли новый этап "Договор подписан" или "ЗМО: Договор подписан"
        IF v_stage_name IN ('Договор подписан', 'ЗМО: Договор подписан') THEN
            
            -- Находим первый этап реализации (с минимальным order_index)
            SELECT id INTO v_first_realization_stage_id
            FROM tender_stages
            WHERE category = 'realization'
              AND company_id = NEW.company_id
            ORDER BY order_index ASC
            LIMIT 1;
            
            -- Если нашли этап реализации - переводим тендер туда
            IF v_first_realization_stage_id IS NOT NULL THEN
                NEW.stage_id := v_first_realization_stage_id;
                
                -- Опционально: можно установить статус "won" если его нет
                IF NEW.status IS NULL OR NEW.status = '' THEN
                    NEW.status := 'won';
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаём триггер на таблицу tenders
DROP TRIGGER IF EXISTS trigger_auto_move_to_realization ON tenders;
CREATE TRIGGER trigger_auto_move_to_realization
    BEFORE INSERT OR UPDATE ON tenders
    FOR EACH ROW
    EXECUTE FUNCTION auto_move_to_realization();

-- Комментарии
COMMENT ON FUNCTION auto_move_to_realization() IS 'Автоматически переводит тендер в первый этап реализации при достижении этапа "Договор подписан"';
COMMENT ON TRIGGER trigger_auto_move_to_realization ON tenders IS 'Триггер для автоматического перевода тендеров в реализацию';
