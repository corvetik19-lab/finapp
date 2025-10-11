-- Автоматическое списание с кубышки при недостатке средств на карте
-- Работает в 2 этапа: BEFORE INSERT пополняет счёт, AFTER INSERT записывает историю

-- Временная таблица для хранения информации о переводах между BEFORE и AFTER триггерами
CREATE TABLE IF NOT EXISTS stash_transfer_pending (
  transaction_id UUID PRIMARY KEY,
  stash_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION auto_withdraw_from_stash_before()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance BIGINT;
  v_future_balance BIGINT;
  v_stash RECORD;
  v_shortage BIGINT;
  v_transfer_amount BIGINT;
BEGIN
  -- Проверяем только расходные транзакции
  IF NEW.direction != 'expense' THEN
    RETURN NEW;
  END IF;

  -- Получаем текущий баланс счёта ДО транзакции
  SELECT balance INTO v_current_balance
  FROM accounts
  WHERE id = NEW.account_id;

  -- Вычисляем каким будет баланс ПОСЛЕ этой транзакции
  v_future_balance := v_current_balance - NEW.amount;

  -- Если баланс станет отрицательным - нужно взять из кубышки
  IF v_future_balance < 0 THEN
    -- Получаем кубышку для этого счёта
    SELECT id, balance INTO v_stash
    FROM account_stashes
    WHERE account_id = NEW.account_id
      AND user_id = NEW.user_id
    LIMIT 1;

    IF FOUND AND v_stash.balance > 0 THEN
      -- Сколько не хватает (положительное число)
      v_shortage := ABS(v_future_balance);
      
      -- Сколько можем взять из кубышки (не больше чем есть)
      v_transfer_amount := LEAST(v_shortage, v_stash.balance);

      -- Обновляем баланс кубышки
      UPDATE account_stashes
      SET balance = balance - v_transfer_amount
      WHERE id = v_stash.id;

      -- Обновляем баланс счёта (добавляем деньги из кубышки ЗАРАНЕЕ)
      UPDATE accounts
      SET balance = balance + v_transfer_amount
      WHERE id = NEW.account_id;

      -- Сохраняем информацию о переводе для AFTER триггера
      INSERT INTO stash_transfer_pending (transaction_id, stash_id, amount)
      VALUES (NEW.id, v_stash.id, v_transfer_amount)
      ON CONFLICT (transaction_id) DO UPDATE 
      SET stash_id = EXCLUDED.stash_id, amount = EXCLUDED.amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для записи истории AFTER INSERT
CREATE OR REPLACE FUNCTION auto_withdraw_from_stash_after()
RETURNS TRIGGER AS $$
DECLARE
  v_transfer_info RECORD;
BEGIN
  -- Проверяем был ли автоматический перевод
  SELECT stash_id, amount INTO v_transfer_info
  FROM stash_transfer_pending
  WHERE transaction_id = NEW.id;

  IF FOUND THEN
    -- Записываем в историю переводов
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
      'from_stash',
      v_transfer_info.amount,
      NEW.occurred_at
    );

    -- Удаляем запись из временной таблицы
    DELETE FROM stash_transfer_pending WHERE transaction_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старые триггеры
DROP TRIGGER IF EXISTS trigger_auto_withdraw_from_stash ON transactions;
DROP TRIGGER IF EXISTS trigger_record_stash_transfer ON transactions;
DROP TRIGGER IF EXISTS trigger_auto_withdraw_before ON transactions;
DROP TRIGGER IF EXISTS trigger_auto_withdraw_after ON transactions;

-- Триггер BEFORE INSERT - пополняет счёт из кубышки ДО списания
CREATE TRIGGER trigger_auto_withdraw_before
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_withdraw_from_stash_before();

-- Триггер AFTER INSERT - записывает историю переводов
CREATE TRIGGER trigger_auto_withdraw_after
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_withdraw_from_stash_after();

-- Комментарии
COMMENT ON FUNCTION auto_withdraw_from_stash_before() IS 
'Автоматически берёт деньги из кубышки ПЕРЕД списанием если на счёте недостаточно средств';

COMMENT ON FUNCTION auto_withdraw_from_stash_after() IS 
'Записывает историю автоматических переводов из кубышки';

COMMENT ON TRIGGER trigger_auto_withdraw_before ON transactions IS 
'Автоматическое пополнение счёта из кубышки ДО списания (предотвращает отрицательный баланс)';

COMMENT ON TRIGGER trigger_auto_withdraw_after ON transactions IS 
'Запись истории автоматических переводов из кубышки';
