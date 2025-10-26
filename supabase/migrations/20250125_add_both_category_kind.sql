-- Добавляем новое значение "both" к типу категорий
-- Это позволит использовать одну категорию и для доходов, и для расходов

-- Удаляем старый constraint
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_kind_check;

-- Добавляем новый constraint с поддержкой "both"
ALTER TABLE categories ADD CONSTRAINT categories_kind_check 
  CHECK (kind = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text, 'both'::text]));
