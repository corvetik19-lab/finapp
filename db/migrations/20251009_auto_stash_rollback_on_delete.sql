-- Автоматический откат перевода из кубышки при удалении транзакции
-- Если удаляется транзакция которая использовала деньги из кубышки - возвращаем их обратно

CREATE OR REPLACE FUNCTION rollback_stash_transfer_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  -- Проверяем была ли это транзакция с автоматическим переводом из кубышки
  SELECT 
    stash_id,
    amount,
    direction
  INTO v_transfer
  FROM account_stash_transfers
  WHERE transaction_id = OLD.id;

  IF FOUND AND v_transfer.direction = 'from_stash' THEN
    -- Возвращаем деньги обратно в кубышку, но не больше лимита
    UPDATE account_stashes
    SET balance = LEAST(balance + v_transfer.amount, target_amount)
    WHERE id = v_transfer.stash_id;

    -- НЕ трогаем баланс счёта! 
    -- reverseBalanceChange в deleteTransaction сам восстановит полную сумму транзакции
    -- Нам нужно только вернуть деньги в кубышку

    -- Удаляем запись о переводе
    DELETE FROM account_stash_transfers
    WHERE transaction_id = OLD.id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Триггер срабатывает BEFORE DELETE транзакции
DROP TRIGGER IF EXISTS trigger_rollback_stash_transfer ON transactions;

CREATE TRIGGER trigger_rollback_stash_transfer
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION rollback_stash_transfer_on_delete();

-- Комментарии
COMMENT ON FUNCTION rollback_stash_transfer_on_delete() IS 
'Возвращает деньги в кубышку при удалении транзакции которая использовала автоматический перевод';

COMMENT ON TRIGGER trigger_rollback_stash_transfer ON transactions IS 
'Автоматический откат переводов из кубышки при удалении транзакций';
