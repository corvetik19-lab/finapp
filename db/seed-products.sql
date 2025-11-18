-- Добавление тестовых товаров для обработки чеков
-- ВАЖНО: Замените 'YOUR_USER_ID' на реальный user_id из таблицы auth.users

-- Сначала получим user_id (выполните эту команду отдельно чтобы узнать свой ID)
-- SELECT id, email FROM auth.users LIMIT 1;

-- Затем вставьте товары (замените USER_ID на ваш реальный ID):
INSERT INTO product_items (user_id, name, default_unit, default_price_per_unit, category, is_active)
VALUES
  -- Еда
  ((SELECT id FROM auth.users LIMIT 1), 'Онигири', 'шт', 9000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Батончик', 'шт', 1700, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Жевательная резинка', 'шт', 4000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Кола', 'л', 10000, 'Напитки', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Молоко', 'л', 8000, 'Напитки', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Хлеб', 'шт', 5000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Масло', 'кг', 15000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Сыр', 'кг', 60000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Яйца', 'уп', 12000, 'Еда', true),
  ((SELECT id FROM auth.users LIMIT 1), 'Курица', 'кг', 35000, 'Мясо', true)
ON CONFLICT DO NOTHING;

-- Проверка что товары добавлены
SELECT 
  name, 
  default_unit, 
  default_price_per_unit / 100.0 as price_rub,
  category,
  is_active,
  created_at
FROM product_items
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY name;
