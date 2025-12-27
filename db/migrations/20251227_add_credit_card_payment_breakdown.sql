-- Добавляем поля для разделения платежа по кредитной карте на основной долг и проценты
-- principal_amount - часть платежа, идущая на погашение основного долга (мин. платёж = % от долга)
-- interest_amount - часть платежа, идущая на погашение процентов (остаток от платежа)

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS principal_amount bigint DEFAULT NULL,
ADD COLUMN IF NOT EXISTS interest_amount bigint DEFAULT NULL;

COMMENT ON COLUMN public.transactions.principal_amount IS 'Часть платежа на погашение основного долга (для кредитных карт)';
COMMENT ON COLUMN public.transactions.interest_amount IS 'Часть платежа на погашение процентов (для кредитных карт)';
