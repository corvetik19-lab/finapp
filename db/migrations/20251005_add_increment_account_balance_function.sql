-- Функция для увеличения баланса счёта
-- Используется при создании транзакций пополнения/расхода

CREATE OR REPLACE FUNCTION public.increment_account_balance(
  p_account_id uuid,
  p_amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.increment_account_balance IS 'Увеличивает или уменьшает баланс счёта на указанную сумму. Используется при создании транзакций.';
