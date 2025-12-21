-- =====================================================
-- Добавление столбца city в таблицу suppliers
-- Дата: 21 декабря 2025
-- =====================================================

-- Добавляем столбец city для геолокации по городу
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS city VARCHAR(200);

-- Индекс для поиска по городу
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city) WHERE city IS NOT NULL;

-- Комментарий
COMMENT ON COLUMN suppliers.city IS 'Город поставщика для геолокации и фильтрации';
