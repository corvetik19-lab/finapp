-- Исправление логики переводов
-- Переводы должны создавать ОДНУ транзакцию с direction='transfer' и обновлять балансы обоих счетов

-- Добавляем поля для хранения информации о переводе
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transfer_from_account_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS transfer_to_account_id uuid REFERENCES public.accounts(id);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_from ON public.transactions(transfer_from_account_id) WHERE direction = 'transfer';
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to ON public.transactions(transfer_to_account_id) WHERE direction = 'transfer';

-- Пересоздаем функцию создания перевода
CREATE OR REPLACE FUNCTION public.fn_create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount bigint,
  p_currency char(3),
  p_occurred_at timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_currency char(3);
  v_to_currency char(3);
  v_when timestamptz := COALESCE(p_occurred_at, NOW());
  v_transfer_txn_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'fn_create_transfer: auth.uid() is null';
  END IF;

  IF p_from_account IS NULL OR p_to_account IS NULL THEN
    RAISE EXCEPTION 'fn_create_transfer: account ids are required';
  END IF;

  IF p_from_account = p_to_account THEN
    RAISE EXCEPTION 'fn_create_transfer: accounts must differ';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'fn_create_transfer: amount must be positive';
  END IF;

  -- Проверка счета-источника
  SELECT currency
    INTO v_from_currency
    FROM public.accounts
   WHERE id = p_from_account
     AND user_id = v_user_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_create_transfer: source account not found or not owned by user';
  END IF;

  -- Проверка счета-назначения
  SELECT currency
    INTO v_to_currency
    FROM public.accounts
   WHERE id = p_to_account
     AND user_id = v_user_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_create_transfer: destination account not found or not owned by user';
  END IF;

  IF v_from_currency <> v_to_currency THEN
    RAISE EXCEPTION 'fn_create_transfer: accounts currencies mismatch';
  END IF;

  IF v_from_currency <> p_currency THEN
    RAISE EXCEPTION 'fn_create_transfer: currency parameter mismatch';
  END IF;

  -- Создаем ОДНУ транзакцию с direction='transfer'
  INSERT INTO public.transactions (
    user_id,
    account_id,
    category_id,
    direction,
    amount,
    currency,
    occurred_at,
    note,
    counterparty,
    transfer_from_account_id,
    transfer_to_account_id,
    attachment_count,
    tags
  ) VALUES (
    v_user_id,
    p_from_account,  -- основной счет - источник
    NULL,
    'transfer',
    p_amount,
    v_from_currency,
    v_when,
    p_note,
    'Перевод',
    p_from_account,
    p_to_account,
    0,
    '[]'::jsonb
  )
  RETURNING id INTO v_transfer_txn_id;

  -- Обновляем баланс счета-источника (уменьшаем)
  UPDATE public.accounts
     SET balance = balance - p_amount
   WHERE id = p_from_account
     AND user_id = v_user_id;

  -- Обновляем баланс счета-назначения (увеличиваем)
  UPDATE public.accounts
     SET balance = balance + p_amount
   WHERE id = p_to_account
     AND user_id = v_user_id;

  RETURN v_transfer_txn_id;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.fn_create_transfer IS 'Создает перевод между счетами как ОДНУ транзакцию с direction=transfer и обновляет балансы обоих счетов';
