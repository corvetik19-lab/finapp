-- Добавляем поле product_id в transaction_items для связи с product_items
-- Это позволит автоматически обновлять название, единицу измерения и категорию
-- при изменении товара в справочнике

-- 1. Добавляем колонку product_id (nullable, т.к. старые записи не имеют связи)
ALTER TABLE transaction_items
ADD COLUMN product_id uuid REFERENCES product_items(id) ON DELETE SET NULL;

-- 2. Создаем индекс для быстрого поиска по product_id
CREATE INDEX idx_transaction_items_product_id ON transaction_items(product_id);

-- 3. Пытаемся автоматически связать существующие записи с товарами по названию
-- (только для активных товаров текущего пользователя)
UPDATE transaction_items ti
SET product_id = pi.id
FROM product_items pi
WHERE ti.product_id IS NULL
  AND ti.user_id = pi.user_id
  AND LOWER(TRIM(ti.name)) = LOWER(TRIM(pi.name))
  AND pi.is_active = true;

-- 4. Комментарий к колонке
COMMENT ON COLUMN transaction_items.product_id IS 
'Ссылка на товар из справочника. Если указана, то название, единица и категория берутся из product_items';
