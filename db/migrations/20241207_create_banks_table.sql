-- Создание таблицы банков для справочника
-- Используется для банковских гарантий и платежей

CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  bik VARCHAR(9) NOT NULL,
  correspondent_account VARCHAR(20),
  swift VARCHAR(11),
  address TEXT,
  phone TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Уникальность БИК в рамках компании
  CONSTRAINT banks_company_bik_unique UNIQUE (company_id, bik)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_banks_company_id ON banks(company_id);
CREATE INDEX IF NOT EXISTS idx_banks_bik ON banks(bik);
CREATE INDEX IF NOT EXISTS idx_banks_is_active ON banks(is_active);

-- RLS политики
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: пользователь видит банки своей компании
CREATE POLICY banks_select_policy ON banks
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Политика для вставки: пользователь может добавлять банки в свою компанию
CREATE POLICY banks_insert_policy ON banks
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Политика для обновления: пользователь может обновлять банки своей компании
CREATE POLICY banks_update_policy ON banks
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Политика для удаления: пользователь может удалять банки своей компании
CREATE POLICY banks_delete_policy ON banks
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Комментарии
COMMENT ON TABLE banks IS 'Справочник банков для организации';
COMMENT ON COLUMN banks.bik IS 'Банковский идентификационный код (9 цифр)';
COMMENT ON COLUMN banks.correspondent_account IS 'Корреспондентский счёт (20 цифр)';
COMMENT ON COLUMN banks.swift IS 'SWIFT код для международных переводов';
