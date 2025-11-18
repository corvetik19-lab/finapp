-- Добавление поля category в transaction_items
-- Категория товара сохраняется из справочника товаров

ALTER TABLE transaction_items
ADD COLUMN category TEXT;

-- Комментарий для документации
COMMENT ON COLUMN transaction_items.category IS 'Категория товара из справочника';
