-- Добавление company_id в таблицу upcoming_payments
-- Это позволяет фильтровать платежи по компании

ALTER TABLE public.upcoming_payments
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Индекс для быстрой фильтрации по компании
CREATE INDEX IF NOT EXISTS upcoming_payments_company_id_idx
  ON public.upcoming_payments (company_id);

-- Обновляем RLS политики для учёта company_id
-- Пользователь может видеть платежи своей компании или свои личные (без company_id)

DROP POLICY IF EXISTS "Select own upcoming_payments" ON public.upcoming_payments;
CREATE POLICY "Select own upcoming_payments"
  ON public.upcoming_payments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert own upcoming_payments" ON public.upcoming_payments;
CREATE POLICY "Insert own upcoming_payments"
  ON public.upcoming_payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Update own upcoming_payments" ON public.upcoming_payments;
CREATE POLICY "Update own upcoming_payments"
  ON public.upcoming_payments
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Delete own upcoming_payments" ON public.upcoming_payments;
CREATE POLICY "Delete own upcoming_payments"
  ON public.upcoming_payments
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  );
