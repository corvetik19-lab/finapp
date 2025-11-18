-- Добавление поля category_type в таблицу product_items
-- Это поле хранит тип категории (income/expense) для товаров с категориями типа "both"

ALTER TABLE product_items
ADD COLUMN IF NOT EXISTS category_type TEXT CHECK (category_type IN ('income', 'expense'));

COMMENT ON COLUMN product_items.category_type IS 'Тип категории для товаров с категориями both (income или expense)';
