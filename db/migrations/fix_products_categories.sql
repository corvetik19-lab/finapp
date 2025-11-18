-- Обновляем товары без категории, устанавливаем категорию "Питание"
-- Сначала находим ID категории "Питание"

UPDATE product_items
SET category_id = (
  SELECT id FROM categories 
  WHERE name = 'Питание' 
  AND kind = 'expense' 
  LIMIT 1
)
WHERE category_id IS NULL
AND is_active = true;

-- Проверяем результат
SELECT 
  pi.id,
  pi.name,
  pi.category_id,
  c.name as category_name
FROM product_items pi
LEFT JOIN categories c ON pi.category_id = c.id
WHERE pi.is_active = true
ORDER BY pi.name;
