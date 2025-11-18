-- Создание таблицы для позиций товаров в транзакциях
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'шт',
  price_per_unit BIGINT NOT NULL, -- цена за единицу в копейках
  total_amount BIGINT NOT NULL, -- общая сумма позиции в копейках (quantity * price_per_unit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_user_id ON transaction_items(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_created_at ON transaction_items(created_at DESC);

-- RLS политики
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Политика на чтение: пользователь видит только свои позиции
CREATE POLICY "Users can view their own transaction items"
  ON transaction_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика на создание: пользователь может создавать только свои позиции
CREATE POLICY "Users can create their own transaction items"
  ON transaction_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика на обновление: пользователь может обновлять только свои позиции
CREATE POLICY "Users can update their own transaction items"
  ON transaction_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика на удаление: пользователь может удалять только свои позиции
CREATE POLICY "Users can delete their own transaction items"
  ON transaction_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_transaction_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_items_updated_at
  BEFORE UPDATE ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_items_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE transaction_items IS 'Позиции товаров в транзакциях для детализации покупок';
COMMENT ON COLUMN transaction_items.name IS 'Название товара/позиции';
COMMENT ON COLUMN transaction_items.quantity IS 'Количество единиц товара';
COMMENT ON COLUMN transaction_items.unit IS 'Единица измерения (шт, кг, л и т.д.)';
COMMENT ON COLUMN transaction_items.price_per_unit IS 'Цена за единицу в копейках';
COMMENT ON COLUMN transaction_items.total_amount IS 'Общая сумма позиции в копейках';
