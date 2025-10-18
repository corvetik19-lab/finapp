-- Создание всех категорий для тестового импорта
-- Расходные категории
INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Продукты', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Продукты' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Кафе', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Кафе' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Транспорт', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Транспорт' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Одежда', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Одежда' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Здоровье', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Здоровье' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Развлечения', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Развлечения' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Электроника', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Электроника' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Образование', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Образование' AND user_id = auth.uid());

INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Коммунальные', 'expense', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Коммунальные' AND user_id = auth.uid());

-- Доходные категории
INSERT INTO categories (name, type, user_id, created_at, updated_at)
SELECT 'Прочее', 'income', auth.uid(), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Прочее' AND user_id = auth.uid() AND type = 'income');
