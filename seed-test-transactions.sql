-- ============================================
-- ТЕСТОВЫЕ ТРАНЗАКЦИИ ДЛЯ ПРОГНОЗА
-- Добавляет транзакции за сентябрь и август 2025
-- Для пользователя igor@mastersql.ru
-- ============================================

-- Получаем ID пользователя, счёта и категорий
DO $$
DECLARE
  v_user_id uuid;
  v_account_id uuid;
  v_cat_salary uuid;
  v_cat_products uuid;
  v_cat_cafe uuid;
  v_cat_transport uuid;
  v_cat_entertainment uuid;
  v_cat_clothes uuid;
  v_cat_health uuid;
  v_cat_restaurants uuid;
  v_cat_education uuid;
BEGIN
  -- Находим пользователя
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'igor@mastersql.ru' 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Пользователь не найден!';
  END IF;

  -- Находим первый счёт пользователя
  SELECT id INTO v_account_id 
  FROM accounts 
  WHERE user_id = v_user_id 
  ORDER BY created_at 
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Счёт не найден!';
  END IF;

  -- Находим категории
  SELECT id INTO v_cat_salary FROM categories WHERE user_id = v_user_id AND name = 'Зарплата' AND kind = 'income' LIMIT 1;
  SELECT id INTO v_cat_products FROM categories WHERE user_id = v_user_id AND name = 'Продукты' LIMIT 1;
  SELECT id INTO v_cat_cafe FROM categories WHERE user_id = v_user_id AND name = 'Кафе' LIMIT 1;
  SELECT id INTO v_cat_transport FROM categories WHERE user_id = v_user_id AND name = 'Транспорт' LIMIT 1;
  SELECT id INTO v_cat_entertainment FROM categories WHERE user_id = v_user_id AND name = 'Развлечения' LIMIT 1;
  SELECT id INTO v_cat_clothes FROM categories WHERE user_id = v_user_id AND name = 'Одежда' LIMIT 1;
  SELECT id INTO v_cat_health FROM categories WHERE user_id = v_user_id AND name = 'Здоровье' LIMIT 1;
  SELECT id INTO v_cat_restaurants FROM categories WHERE user_id = v_user_id AND name = 'Рестораны' LIMIT 1;
  SELECT id INTO v_cat_education FROM categories WHERE user_id = v_user_id AND name = 'Образование' LIMIT 1;

  RAISE NOTICE 'Добавляем транзакции для пользователя: %', v_user_id;
  RAISE NOTICE 'Счёт: %', v_account_id;

  -- ============================================
  -- СЕНТЯБРЬ 2025
  -- ============================================
  
  -- Зарплата сентября
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES (v_user_id, v_account_id, v_cat_salary, 15000000, 'RUB', 'income', 'Зарплата сентябрь', '2025-09-25 12:00:00+00', ARRAY[]::text[]);

  -- Продукты (несколько покупок)
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_products, 450000, 'RUB', 'expense', 'Продукты Магнит', '2025-09-02 10:30:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 380000, 'RUB', 'expense', 'Продукты Пятёрочка', '2025-09-07 18:45:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 520000, 'RUB', 'expense', 'Продукты Перекрёсток', '2025-09-12 11:20:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 410000, 'RUB', 'expense', 'Продукты Магнит', '2025-09-18 19:10:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 490000, 'RUB', 'expense', 'Продукты Пятёрочка', '2025-09-24 16:30:00+00', ARRAY[]::text[]);

  -- Кафе и рестораны
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_cafe, 25000, 'RUB', 'expense', 'Кофе Starbucks', '2025-09-03 09:15:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 32000, 'RUB', 'expense', 'Обед кафе', '2025-09-05 13:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 28000, 'RUB', 'expense', 'Кофе Coffee House', '2025-09-10 10:20:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 35000, 'RUB', 'expense', 'Обед кафе', '2025-09-15 12:45:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_restaurants, 180000, 'RUB', 'expense', 'Ужин в ресторане', '2025-09-20 19:30:00+00', ARRAY[]::text[]);

  -- Транспорт
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_transport, 15000, 'RUB', 'expense', 'Метро', '2025-09-04 08:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_transport, 25000, 'RUB', 'expense', 'Такси', '2025-09-08 22:30:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_transport, 18000, 'RUB', 'expense', 'Метро', '2025-09-16 08:15:00+00', ARRAY[]::text[]);

  -- Развлечения
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_entertainment, 120000, 'RUB', 'expense', 'Кино', '2025-09-14 18:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_entertainment, 85000, 'RUB', 'expense', 'Боулинг', '2025-09-21 20:00:00+00', ARRAY[]::text[]);

  -- Одежда
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_clothes, 320000, 'RUB', 'expense', 'Куртка H&M', '2025-09-09 15:20:00+00', ARRAY[]::text[]);

  -- Здоровье
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_health, 95000, 'RUB', 'expense', 'Аптека', '2025-09-11 17:40:00+00', ARRAY[]::text[]);

  -- Образование
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_education, 250000, 'RUB', 'expense', 'Онлайн курс', '2025-09-06 14:00:00+00', ARRAY[]::text[]);

  -- ============================================
  -- АВГУСТ 2025
  -- ============================================
  
  -- Зарплата августа
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES (v_user_id, v_account_id, v_cat_salary, 14500000, 'RUB', 'income', 'Зарплата август', '2025-08-25 12:00:00+00', ARRAY[]::text[]);

  -- Продукты
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_products, 420000, 'RUB', 'expense', 'Продукты Магнит', '2025-08-03 11:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 390000, 'RUB', 'expense', 'Продукты Пятёрочка', '2025-08-08 18:20:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 480000, 'RUB', 'expense', 'Продукты Перекрёсток', '2025-08-14 12:30:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 440000, 'RUB', 'expense', 'Продукты Магнит', '2025-08-20 17:45:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_products, 510000, 'RUB', 'expense', 'Продукты Пятёрочка', '2025-08-27 16:10:00+00', ARRAY[]::text[]);

  -- Кафе и рестораны
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_cafe, 27000, 'RUB', 'expense', 'Кофе Starbucks', '2025-08-05 09:30:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 30000, 'RUB', 'expense', 'Обед кафе', '2025-08-09 13:15:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 26000, 'RUB', 'expense', 'Кофе Coffee House', '2025-08-13 10:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_cafe, 33000, 'RUB', 'expense', 'Обед кафе', '2025-08-19 12:20:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_restaurants, 195000, 'RUB', 'expense', 'Ужин в ресторане', '2025-08-22 20:00:00+00', ARRAY[]::text[]);

  -- Транспорт
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_transport, 14000, 'RUB', 'expense', 'Метро', '2025-08-02 08:10:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_transport, 30000, 'RUB', 'expense', 'Такси', '2025-08-10 23:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_transport, 16000, 'RUB', 'expense', 'Метро', '2025-08-18 08:30:00+00', ARRAY[]::text[]);

  -- Развлечения
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_entertainment, 150000, 'RUB', 'expense', 'Театр', '2025-08-15 19:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_entertainment, 75000, 'RUB', 'expense', 'Музей', '2025-08-24 14:00:00+00', ARRAY[]::text[]);

  -- Одежда
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_clothes, 280000, 'RUB', 'expense', 'Джинсы Zara', '2025-08-12 16:30:00+00', ARRAY[]::text[]);

  -- Здоровье
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_health, 120000, 'RUB', 'expense', 'Врач', '2025-08-07 15:00:00+00', ARRAY[]::text[]),
    (v_user_id, v_account_id, v_cat_health, 85000, 'RUB', 'expense', 'Аптека', '2025-08-16 18:20:00+00', ARRAY[]::text[]);

  -- Образование
  INSERT INTO transactions (user_id, account_id, category_id, amount, currency, direction, note, occurred_at, tags)
  VALUES 
    (v_user_id, v_account_id, v_cat_education, 220000, 'RUB', 'expense', 'Книги', '2025-08-11 13:45:00+00', ARRAY[]::text[]);

  RAISE NOTICE '✅ Успешно добавлено ~50 тестовых транзакций за август и сентябрь 2025!';
  RAISE NOTICE 'Теперь можно проверить прогноз на /forecasts';

END $$;
