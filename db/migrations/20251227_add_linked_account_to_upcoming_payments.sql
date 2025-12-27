-- Добавляем поля для связи с кредитными картами и кредитами
ALTER TABLE public.upcoming_payments
ADD COLUMN IF NOT EXISTS linked_credit_card_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS upcoming_payments_linked_credit_card_idx
  ON public.upcoming_payments (linked_credit_card_id) WHERE linked_credit_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS upcoming_payments_linked_loan_idx
  ON public.upcoming_payments (linked_loan_id) WHERE linked_loan_id IS NOT NULL;

COMMENT ON COLUMN public.upcoming_payments.linked_credit_card_id IS 'Связанная кредитная карта (опционально)';
COMMENT ON COLUMN public.upcoming_payments.linked_loan_id IS 'Связанный кредит (опционально)';
