-- Создание таблицы для сохранённых отчётов

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  period text NOT NULL CHECK (period IN ('month', 'last_month', 'quarter', 'year', 'custom')),
  date_from date,
  date_to date,
  data_types text[] NOT NULL DEFAULT '{}',
  categories text[] DEFAULT '{}',
  accounts text[] DEFAULT '{}',
  report_type text NOT NULL DEFAULT 'table' CHECK (report_type IN ('table', 'chart', 'pie', 'combined')),
  format text NOT NULL DEFAULT 'preview' CHECK (format IN ('pdf', 'excel', 'preview')),
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Индексы
CREATE INDEX IF NOT EXISTS reports_user_id_idx ON public.reports (user_id);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_category_idx ON public.reports (category);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at_trigger ON public.reports;
CREATE TRIGGER reports_updated_at_trigger
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- RLS политики
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
CREATE POLICY "Users can update own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
CREATE POLICY "Users can delete own reports"
  ON public.reports FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии
COMMENT ON TABLE public.reports IS 'Сохранённые отчёты пользователей';
COMMENT ON COLUMN public.reports.data_types IS 'Типы данных: income, expense, loans, cards';
COMMENT ON COLUMN public.reports.categories IS 'ID категорий для фильтрации';
COMMENT ON COLUMN public.reports.accounts IS 'ID счетов/карт для фильтрации';
