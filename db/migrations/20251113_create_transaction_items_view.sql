-- Создаем VIEW для отображения позиций товаров с актуальными данными из справочника
-- Если у позиции есть product_id, то название, единица и категория берутся из product_items
-- Если нет - используются сохраненные значения

CREATE OR REPLACE VIEW transaction_items_with_products AS
SELECT 
  ti.id,
  ti.transaction_id,
  ti.user_id,
  ti.product_id,
  -- Название: из справочника если есть связь, иначе сохраненное
  COALESCE(pi.name, ti.name) as name,
  ti.quantity,
  -- Единица измерения: из справочника если есть связь, иначе сохраненная
  COALESCE(pi.default_unit, ti.unit) as unit,
  ti.price_per_unit,
  ti.total_amount,
  -- Категория: из справочника товара если есть связь, иначе сохраненная
  COALESCE(pi.category_id, ti.category_id) as category_id,
  ti.created_at,
  ti.updated_at,
  -- Дополнительная информация о товаре
  pi.name as product_name,
  pi.default_unit as product_unit,
  pi.category_id as product_category_id,
  -- Информация о категории
  c.name as category_name,
  c.kind as category_kind
FROM transaction_items ti
LEFT JOIN product_items pi ON ti.product_id = pi.id AND pi.is_active = true
LEFT JOIN categories c ON COALESCE(pi.category_id, ti.category_id) = c.id;

-- Комментарий к VIEW
COMMENT ON VIEW transaction_items_with_products IS 
'VIEW для отображения позиций товаров с актуальными данными из справочника product_items. 
Если у позиции есть product_id, то название, единица и категория автоматически обновляются при изменении товара.';
