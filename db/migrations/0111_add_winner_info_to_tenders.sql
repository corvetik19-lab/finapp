-- Добавляем поля для информации о победителе в таблицу tenders
ALTER TABLE tenders
ADD COLUMN IF NOT EXISTS winner_inn VARCHAR(12),
ADD COLUMN IF NOT EXISTS winner_name TEXT,
ADD COLUMN IF NOT EXISTS winner_price BIGINT;

-- Комментарии к полям
COMMENT ON COLUMN tenders.winner_inn IS 'ИНН победителя тендера';
COMMENT ON COLUMN tenders.winner_name IS 'Название компании-победителя';
COMMENT ON COLUMN tenders.winner_price IS 'Цена победы в копейках';
