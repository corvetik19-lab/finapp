-- Создание таблицы для учета долгов
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('owe', 'owed')), -- owe = вы должны, owed = вам должны
  creditor_debtor_name TEXT NOT NULL, -- имя кредитора или должника
  amount BIGINT NOT NULL CHECK (amount > 0), -- сумма в копейках
  currency TEXT NOT NULL DEFAULT 'RUB',
  date_created DATE NOT NULL, -- дата создания долга
  date_due DATE, -- срок возврата (опционально)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'partially_paid')),
  amount_paid BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid >= 0), -- уже выплачено в копейках
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_type ON debts(type);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_date_due ON debts(date_due);
CREATE INDEX IF NOT EXISTS idx_debts_deleted_at ON debts(deleted_at);

-- Включаем RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Политики RLS: пользователь может видеть и изменять только свои долги
CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts"
  ON debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE
  USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW
  EXECUTE FUNCTION update_debts_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE debts IS 'Таблица для учета долгов (кто кому должен)';
COMMENT ON COLUMN debts.type IS 'Тип долга: owe (вы должны) или owed (вам должны)';
COMMENT ON COLUMN debts.creditor_debtor_name IS 'Имя кредитора (если вы должны) или должника (если вам должны)';
COMMENT ON COLUMN debts.amount IS 'Полная сумма долга в копейках';
COMMENT ON COLUMN debts.amount_paid IS 'Уже выплаченная сумма в копейках';
COMMENT ON COLUMN debts.status IS 'Статус долга: active, paid, partially_paid';
