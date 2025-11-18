-- Таблица для хранения справочника товаров/позиций
CREATE TABLE IF NOT EXISTS product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_unit TEXT NOT NULL DEFAULT 'шт',
  default_price_per_unit BIGINT, -- в копейках, может быть NULL
  category TEXT, -- опциональная категория товара
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_product_items_user_id ON product_items(user_id);
CREATE INDEX idx_product_items_name ON product_items(user_id, name);
CREATE INDEX idx_product_items_active ON product_items(user_id, is_active);

-- RLS политики
ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product items"
  ON product_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product items"
  ON product_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product items"
  ON product_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product items"
  ON product_items FOR DELETE
  USING (auth.uid() = user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_product_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_items_updated_at
  BEFORE UPDATE ON product_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_items_updated_at();
