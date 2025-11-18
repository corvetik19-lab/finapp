-- Добавляем категорию "Без категории" для товаров без категории
-- Эта миграция создаёт специальную категорию, которая используется по умолчанию для товаров

-- Создаём категорию "Без категории" для расходов (если её ещё нет)
INSERT INTO categories (name, kind, icon, color, user_id)
SELECT 
  'Без категории',
  'expense',
  'category',
  '#9e9e9e',
  id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE name = 'Без категории' 
  AND user_id = auth.users.id
)
ON CONFLICT DO NOTHING;

-- Комментарий к таблице для документации
COMMENT ON TABLE categories IS 'Категории транзакций. Категория "Без категории" используется по умолчанию для товаров без явно указанной категории';
