-- Добавление полей для кредитных карт в таблицу accounts

-- Добавляем поля для кредитных карт
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS credit_limit bigint,
  ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS grace_period integer,
  ADD COLUMN IF NOT EXISTS next_payment_date date,
  ADD COLUMN IF NOT EXISTS min_payment bigint,
  ADD COLUMN IF NOT EXISTS card_number_last4 varchar(4);

-- Комментарии к полям
COMMENT ON COLUMN public.accounts.credit_limit IS 'Кредитный лимит в минорных единицах (копейках)';
COMMENT ON COLUMN public.accounts.interest_rate IS 'Процентная ставка (годовая)';
COMMENT ON COLUMN public.accounts.grace_period IS 'Льготный период в днях';
COMMENT ON COLUMN public.accounts.next_payment_date IS 'Дата следующего платежа';
COMMENT ON COLUMN public.accounts.min_payment IS 'Минимальный платеж в минорных единицах';
COMMENT ON COLUMN public.accounts.card_number_last4 IS 'Последние 4 цифры номера карты';
