-- Миграция: Таблица для хранения чеков из ФНС
-- Дата: 2024-10-23
-- Описание: Хранение чеков, импортированных из Telegram ФНС бота

-- Создаём таблицу receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Данные чека
  shop_name TEXT,
  date TIMESTAMPTZ NOT NULL,
  total_amount BIGINT NOT NULL, -- В копейках
  items_count INTEGER DEFAULT 0,
  main_category TEXT,
  
  -- Сырые данные
  raw_text TEXT, -- Оригинальный текст чека
  
  -- Статус обработки
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_amount CHECK (total_amount > 0),
  CONSTRAINT positive_items CHECK (items_count >= 0)
);

-- Индексы
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(date DESC);
CREATE INDEX idx_receipts_shop_name ON receipts(shop_name);
CREATE INDEX idx_receipts_processed ON receipts(processed) WHERE processed = true;

-- RLS (Row Level Security)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
CREATE TRIGGER receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_updated_at();

-- Комментарии
COMMENT ON TABLE receipts IS 'Чеки, импортированные из Telegram ФНС бота';
COMMENT ON COLUMN receipts.total_amount IS 'Общая сумма чека в копейках';
COMMENT ON COLUMN receipts.raw_text IS 'Оригинальный текст чека из Telegram';
COMMENT ON COLUMN receipts.main_category IS 'Основная категория, определённая AI';
