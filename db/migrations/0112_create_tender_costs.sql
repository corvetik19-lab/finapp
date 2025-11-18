-- Создание таблицы затрат по контракту
CREATE TABLE IF NOT EXISTS tender_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount BIGINT NOT NULL, -- в копейках
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tender_costs_tender_id ON tender_costs(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_costs_date ON tender_costs(date);
CREATE INDEX IF NOT EXISTS idx_tender_costs_category ON tender_costs(category);

-- RLS политики
ALTER TABLE tender_costs ENABLE ROW LEVEL SECURITY;

-- Политика на чтение: пользователь может видеть затраты своих тендеров
CREATE POLICY "Users can view costs of their tenders"
  ON tender_costs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_costs.tender_id
      AND tenders.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Политика на создание: пользователь может создавать затраты для своих тендеров
CREATE POLICY "Users can create costs for their tenders"
  ON tender_costs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_costs.tender_id
      AND tenders.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Политика на обновление: пользователь может обновлять затраты своих тендеров
CREATE POLICY "Users can update costs of their tenders"
  ON tender_costs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_costs.tender_id
      AND tenders.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Политика на удаление: пользователь может удалять затраты своих тендеров
CREATE POLICY "Users can delete costs of their tenders"
  ON tender_costs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_costs.tender_id
      AND tenders.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_tender_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tender_costs_updated_at
  BEFORE UPDATE ON tender_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_costs_updated_at();

-- Комментарии
COMMENT ON TABLE tender_costs IS 'Затраты по контракту тендера';
COMMENT ON COLUMN tender_costs.amount IS 'Сумма затраты в копейках';
COMMENT ON COLUMN tender_costs.category IS 'Категория затраты (Закупка товаров, Логистика и т.д.)';
