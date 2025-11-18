-- Добавляем category_id в product_items (если еще нет)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE product_items 
    ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_product_items_category_id ON product_items(category_id);
    
    COMMENT ON COLUMN product_items.category_id IS 'Категория товара (расход/доход)';
  END IF;
END $$;

-- Добавляем category_id в transaction_items (если еще нет)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE transaction_items 
    ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_transaction_items_category_id ON transaction_items(category_id);
    
    COMMENT ON COLUMN transaction_items.category_id IS 'Категория позиции (наследуется от product_item)';
  END IF;
END $$;

-- Удаляем старую колонку category (text) из product_items если есть
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_items' AND column_name = 'category' AND data_type = 'text'
  ) THEN
    ALTER TABLE product_items DROP COLUMN category;
  END IF;
END $$;

-- Удаляем старую колонку category (text) из transaction_items если есть
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_items' AND column_name = 'category' AND data_type = 'text'
  ) THEN
    ALTER TABLE transaction_items DROP COLUMN category;
  END IF;
END $$;
