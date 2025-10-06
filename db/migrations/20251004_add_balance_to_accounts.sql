-- Добавление колонки balance в таблицу accounts

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS balance bigint DEFAULT 0 NOT NULL;

-- Комментарий к полю
COMMENT ON COLUMN public.accounts.balance IS 'Баланс счёта в минорных единицах (копейках). Для кредитных карт - задолженность (отрицательное значение)';

-- Индекс для быстрой выборки по балансу
CREATE INDEX IF NOT EXISTS idx_accounts_balance ON public.accounts(balance) WHERE deleted_at IS NULL;
