-- Миграция: Обновление системы контроля доступа
-- Дата: 2025-11-20
-- Описание: Добавление режимов работы для организаций и сотрудников

-- 1. Добавляем разрешенные режимы для организации
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS allowed_modes TEXT[] DEFAULT ARRAY['finance', 'tenders', 'personal', 'investments'];

COMMENT ON COLUMN organizations.allowed_modes IS 'Список разрешенных режимов для организации: finance, tenders, personal, investments';

-- 2. Индекс для быстрого поиска по режимам (GIN индекс для массивов)
CREATE INDEX IF NOT EXISTS idx_organizations_allowed_modes ON organizations USING GIN (allowed_modes);

-- 3. Добавляем глобальную роль в profiles (если её там нет или она реализована иначе)
-- Проверим, есть ли колонка global_role, если нет - добавим.
-- В текущих политиках используется массив roles, но для однозначности добавим global_role
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS global_role TEXT DEFAULT 'user' 
CHECK (global_role IN ('super_admin', 'admin', 'user'));

COMMENT ON COLUMN profiles.global_role IS 'Глобальная роль пользователя в системе: super_admin, admin, user';

-- 4. Обновляем политики organizations для использования global_role
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.global_role = 'super_admin' OR 'super_admin' = ANY(profiles.roles))
    )
  );

DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.global_role = 'super_admin' OR 'super_admin' = ANY(profiles.roles))
    )
  );

DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.global_role = 'super_admin' OR 'super_admin' = ANY(profiles.roles))
    )
  );

-- 5. Обновляем company_members для хранения доступных режимов пользователя
-- Мы будем использовать поле permissions (JSONB), добавляя туда ключ "allowed_modes": ["finance", "tenders"]
-- Миграция структуры не требуется, так как это JSONB, но добавим комментарий
COMMENT ON COLUMN company_members.permissions IS 'JSONB с правами доступа. Включает allowed_modes: string[] для доступа к режимам';
