-- Миграция: добавление company_id в user_roles
-- Это необходимо для корректного назначения ролей в контексте компании

-- 1. Добавляем колонку company_id
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Обновляем существующие записи: получаем company_id из связанной роли
UPDATE user_roles ur
SET company_id = r.company_id
FROM roles r
WHERE ur.role_id = r.id
  AND ur.company_id IS NULL;

-- 3. Создаём индекс для поиска по company_id
CREATE INDEX IF NOT EXISTS user_roles_company_id_idx ON user_roles(company_id);

-- 4. Убираем старый уникальный индекс только на user_id (если есть)
-- и создаём новый на (user_id, company_id) чтобы один пользователь
-- мог иметь разные роли в разных компаниях
DROP INDEX IF EXISTS user_roles_user_id_idx;

-- Создаём уникальный индекс на user_id + company_id
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_company_unique_idx ON user_roles(user_id, company_id);

-- 5. Обновляем UNIQUE constraint если он есть на user_id
-- Сначала проверяем и удаляем
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_key' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_key;
  END IF;
END $$;

-- Комментарий
COMMENT ON COLUMN user_roles.company_id IS 'ID компании для которой назначена роль пользователю';
