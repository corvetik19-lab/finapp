-- Добавляем поле для хранения даты начала льготного периода
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS grace_period_start_date date DEFAULT NULL;

COMMENT ON COLUMN public.accounts.grace_period_start_date IS 'Дата начала льготного периода для кредитных карт';
