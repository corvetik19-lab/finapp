-- Добавление логики кубышки для доходных транзакций
-- При доходе сначала возвращаем долг кубышке, остаток на карту

CREATE OR REPLACE FUNCTION auto_deposit_to_stash_before()
RETURNS TRIGGER AS $$
DECLARE
  v_stash RECORD;
  v_stash_debt BIGINT;
  v_to_stash BIGINT;
BEGIN
  -- Проверяем только доходные транзакции
  IF NEW.direction != 'income' THEN
    RETURN NEW;
  END IF;

  -- Получаем кубышку для этого счёта
  SELECT id, balance, target_amount INTO v_stash
  FROM account_stashes
  WHERE account_id = NEW.account_id
    AND user_id = NEW.user_id
  LIMIT 1;

  -- Если кубышки нет или лимит не установлен - пропускаем
  IF NOT FOUND OR v_stash.target_amount IS NULL OR v_stash.target_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Если кубышка использовалась (balance < target_amount)
  IF v_stash.balance < v_stash.target_amount THEN
    -- Вычисляем долг кубышке
    v_stash_debt := v_stash.target_amount - v_stash.balance;
    
    -- Сколько отправляем в кубышку (не больше суммы дохода)
    v_to_stash := LEAST(NEW.amount, v_stash_debt);

    -- Возвращаем долг кубышке
    UPDATE account_stashes
    SET balance = balance + v_to_stash
    WHERE id = v_stash.id;

    -- Уменьшаем сумму которая пойдет на карту
    -- (кубышка заберёт v_to_stash, на карту пойдёт amount - v_to_stash)
    -- НО мы не меняем NEW.amount - это сумма транзакции
    -- increment_account_balance добавит полную сумму, 
    -- поэтому нужно вычесть то что ушло в кубышку
    UPDATE accounts
    SET balance = balance - v_to_stash
    WHERE id = NEW.account_id;

    -- Записываем информацию о переводе для истории
    INSERT INTO stash_transfer_pending (transaction_id, stash_id, amount)
    VALUES (NEW.id, v_stash.id, v_to_stash)
    ON CONFLICT (transaction_id) DO UPDATE 
    SET stash_id = EXCLUDED.stash_id, amount = EXCLUDED.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для записи истории доходов в кубышку
CREATE OR REPLACE FUNCTION auto_deposit_to_stash_after()
RETURNS TRIGGER AS $$
DECLARE
  v_transfer_info RECORD;
BEGIN
  -- Проверяем был ли автоматический перевод в кубышку
  SELECT stash_id, amount INTO v_transfer_info
  FROM stash_transfer_pending
  WHERE transaction_id = NEW.id;

  IF FOUND THEN
    -- Записываем в историю переводов (направление to_stash)
    INSERT INTO account_stash_transfers (
      user_id,
      stash_id,
      transaction_id,
      direction,
      amount,
      occurred_at
    ) VALUES (
      NEW.user_id,
      v_transfer_info.stash_id,
      NEW.id,
      'to_stash',
      v_transfer_info.amount,
      NEW.occurred_at
    );

    -- Удаляем запись из временной таблицы
    DELETE FROM stash_transfer_pending WHERE transaction_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем триггеры
DROP TRIGGER IF EXISTS trigger_auto_deposit_before ON transactions;
DROP TRIGGER IF EXISTS trigger_auto_deposit_after ON transactions;

-- Триггер BEFORE INSERT для доходов
CREATE TRIGGER trigger_auto_deposit_before
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_deposit_to_stash_before();

-- Триггер AFTER INSERT для записи истории доходов
CREATE TRIGGER trigger_auto_deposit_after
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_deposit_to_stash_after();

-- Комментарии
COMMENT ON FUNCTION auto_deposit_to_stash_before() IS 
'При доходе автоматически возвращает долг кубышке (до лимита), остаток идёт на карту';

COMMENT ON FUNCTION auto_deposit_to_stash_after() IS 
'Записывает историю автоматических переводов в кубышку при доходах';

COMMENT ON TRIGGER trigger_auto_deposit_before ON transactions IS 
'Автоматический возврат долга кубышке при доходе';

COMMENT ON TRIGGER trigger_auto_deposit_after ON transactions IS 
'Запись истории возврата долга кубышке';
