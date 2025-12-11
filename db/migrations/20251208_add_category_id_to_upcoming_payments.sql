-- Добавление category_id к предстоящим платежам для фильтрации транзакций
ALTER TABLE public.upcoming_payments
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Индекс для быстрого поиска по категории
CREATE INDEX IF NOT EXISTS upcoming_payments_category_id_idx
  ON public.upcoming_payments (category_id);

COMMENT ON COLUMN public.upcoming_payments.category_id IS 'Категория платежа для фильтрации транзакций при привязке';
