-- Добавление поля min_payment_percent для кредитных карт
-- Минимальный платёж теперь хранится как процент от задолженности

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS min_payment_percent numeric(5,2) DEFAULT 5;

COMMENT ON COLUMN public.accounts.min_payment_percent IS 'Процент от задолженности для расчёта минимального платежа';

-- Миграция существующих данных: конвертируем фиксированный min_payment в процент (примерно)
-- Для карт с задолженностью > 0 рассчитываем процент
UPDATE public.accounts
SET min_payment_percent = CASE 
  WHEN credit_limit IS NOT NULL AND credit_limit > balance AND min_payment > 0 
  THEN ROUND((min_payment::numeric / (credit_limit - balance)) * 100, 2)
  ELSE 5
END
WHERE type = 'card' 
  AND credit_limit IS NOT NULL
  AND min_payment_percent IS NULL;
