-- Автоматическое удаление AI отчётов при удалении транзакций
-- Когда удаляется транзакция, удаляем все отчёты за период этой транзакции
-- чтобы они пересчитались заново без удалённых данных

CREATE OR REPLACE FUNCTION delete_ai_summary_on_transaction_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_year_month TEXT;
  v_year_week TEXT;
BEGIN
  -- Формируем ключи периодов для удалённой транзакции
  v_year_month := TO_CHAR(OLD.occurred_at, 'YYYY-MM');
  v_year_week := TO_CHAR(OLD.occurred_at, 'IYYY-IW');

  -- Удаляем AI отчёты за этот месяц
  DELETE FROM ai_summaries
  WHERE user_id = OLD.user_id
    AND period_key = v_year_month;

  -- Удаляем AI отчёты за эту неделю
  DELETE FROM ai_summaries
  WHERE user_id = OLD.user_id
    AND period_key = v_year_week;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Триггер срабатывает AFTER DELETE транзакции
DROP TRIGGER IF EXISTS trigger_delete_ai_summary ON transactions;

CREATE TRIGGER trigger_delete_ai_summary
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION delete_ai_summary_on_transaction_delete();

-- Комментарии
COMMENT ON FUNCTION delete_ai_summary_on_transaction_delete() IS 
'Удаляет AI отчёты за период удалённой транзакции, чтобы они пересчитались заново';

COMMENT ON TRIGGER trigger_delete_ai_summary ON transactions IS 
'Автоматическое удаление AI отчётов при удалении транзакций';
