-- Создание таблиц для управления кредитами

-- Таблица кредитов
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  bank text NOT NULL,
  principal_amount bigint NOT NULL, -- сумма кредита в копейках
  interest_rate numeric(5,2) NOT NULL, -- процентная ставка
  monthly_payment bigint NOT NULL, -- ежемесячный платёж в копейках
  issue_date date NOT NULL, -- дата выдачи
  end_date date, -- дата окончания
  term_months integer, -- срок в месяцах
  currency text NOT NULL DEFAULT 'RUB',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'closed')),
  payment_type text DEFAULT 'annuity' CHECK (payment_type IN ('annuity', 'differentiated')),
  contract_number text,
  next_payment_date date,
  principal_paid bigint DEFAULT 0, -- выплачено по телу кредита
  interest_paid bigint DEFAULT 0, -- выплачено процентов
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

-- Таблица платежей по кредитам
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.loans (id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount bigint NOT NULL, -- сумма платежа в копейках
  principal_amount bigint DEFAULT 0, -- сумма по телу кредита
  interest_amount bigint DEFAULT 0, -- сумма процентов
  transaction_id uuid REFERENCES public.transactions (id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Индексы
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON public.loans (user_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON public.loans (status);
CREATE INDEX IF NOT EXISTS loans_next_payment_date_idx ON public.loans (next_payment_date);
CREATE INDEX IF NOT EXISTS loan_payments_user_id_idx ON public.loan_payments (user_id);
CREATE INDEX IF NOT EXISTS loan_payments_loan_id_idx ON public.loan_payments (loan_id);
CREATE INDEX IF NOT EXISTS loan_payments_date_idx ON public.loan_payments (payment_date);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loans_updated_at_trigger ON public.loans;
CREATE TRIGGER loans_updated_at_trigger
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- RLS политики для loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own loans" ON public.loans;
CREATE POLICY "Users can view own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own loans" ON public.loans;
CREATE POLICY "Users can insert own loans"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own loans" ON public.loans;
CREATE POLICY "Users can update own loans"
  ON public.loans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own loans" ON public.loans;
CREATE POLICY "Users can delete own loans"
  ON public.loans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS политики для loan_payments
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own loan payments" ON public.loan_payments;
CREATE POLICY "Users can view own loan payments"
  ON public.loan_payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own loan payments" ON public.loan_payments;
CREATE POLICY "Users can insert own loan payments"
  ON public.loan_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own loan payments" ON public.loan_payments;
CREATE POLICY "Users can update own loan payments"
  ON public.loan_payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own loan payments" ON public.loan_payments;
CREATE POLICY "Users can delete own loan payments"
  ON public.loan_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии
COMMENT ON TABLE public.loans IS 'Кредиты пользователей';
COMMENT ON TABLE public.loan_payments IS 'Платежи по кредитам';
