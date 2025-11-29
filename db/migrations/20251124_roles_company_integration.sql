-- Миграция: Интеграция ролей с компаниями и сотрудниками
-- Роли теперь привязаны к компании, а сотрудники ссылаются на роли по role_id

-- 1. Добавляем company_id в таблицу roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Переименовываем is_default в is_system для ясности
ALTER TABLE roles RENAME COLUMN is_default TO is_system;

-- 3. Добавляем role_id в таблицу employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id) ON DELETE SET NULL;

-- 4. Создаём индексы
CREATE INDEX IF NOT EXISTS roles_company_id_idx ON roles(company_id);
CREATE INDEX IF NOT EXISTS employees_role_id_idx ON employees(role_id);

-- 5. Обновляем RLS политики для roles
DROP POLICY IF EXISTS "Users can view own roles" ON roles;
DROP POLICY IF EXISTS "Users can create own roles" ON roles;
DROP POLICY IF EXISTS "Users can update own roles" ON roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON roles;

-- Новые политики: роли видны членам компании
CREATE POLICY "Company members can view roles" ON roles
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
    OR company_id IS NULL  -- системные роли видны всем
    OR user_id = auth.uid() -- личные роли пользователя
  );

CREATE POLICY "Company admins can manage roles" ON roles
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
    OR user_id = auth.uid()
  );

-- 6. Функция для создания системных ролей при создании компании
CREATE OR REPLACE FUNCTION create_default_company_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Администратор
  INSERT INTO roles (company_id, name, description, permissions, color, is_system)
  VALUES (
    NEW.id,
    'Администратор',
    'Полный доступ к управлению компанией и сотрудниками',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:delete', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics', 'tenders:import',
      'employees.view', 'employees.create', 'employees.update', 'employees.delete',
      'users:manage', 'roles:manage', 'org:settings', 'audit:view'
    ],
    '#667eea',
    true
  );

  -- Руководитель
  INSERT INTO roles (company_id, name, description, permissions, color, is_system)
  VALUES (
    NEW.id,
    'Руководитель',
    'Просмотр всех тендеров и отчётов, управление командой',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics',
      'employees.view', 'employees.create', 'employees.update',
      'reports:view', 'reports:export'
    ],
    '#764ba2',
    true
  );

  -- Менеджер
  INSERT INTO roles (company_id, name, description, permissions, color, is_system)
  VALUES (
    NEW.id,
    'Менеджер',
    'Управление тендерами, подготовка документации',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:documents',
      'employees.view'
    ],
    '#4facfe',
    true
  );

  -- Специалист
  INSERT INTO roles (company_id, name, description, permissions, color, is_system)
  VALUES (
    NEW.id,
    'Специалист',
    'Работа с назначенными тендерами',
    ARRAY[
      'tenders:view', 'tenders:edit', 'tenders:documents',
      'employees.view'
    ],
    '#43e97b',
    true
  );

  -- Наблюдатель
  INSERT INTO roles (company_id, name, description, permissions, color, is_system)
  VALUES (
    NEW.id,
    'Наблюдатель',
    'Только просмотр информации',
    ARRAY['tenders:view', 'employees.view'],
    '#6b7280',
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Триггер на создание компании
DROP TRIGGER IF EXISTS on_company_created_create_roles ON companies;
CREATE TRIGGER on_company_created_create_roles
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_company_roles();

-- 8. Создаём роли для существующих компаний (если их нет)
DO $$
DECLARE
  company_rec RECORD;
BEGIN
  FOR company_rec IN SELECT id FROM companies LOOP
    -- Проверяем, есть ли уже роли у компании
    IF NOT EXISTS (SELECT 1 FROM roles WHERE company_id = company_rec.id) THEN
      -- Создаём системные роли
      INSERT INTO roles (company_id, name, description, permissions, color, is_system)
      VALUES 
        (company_rec.id, 'Администратор', 'Полный доступ к управлению компанией', 
         ARRAY['tenders:view', 'tenders:create', 'tenders:edit', 'tenders:delete', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics', 'tenders:import', 'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'users:manage', 'roles:manage', 'org:settings'], 
         '#667eea', true),
        (company_rec.id, 'Руководитель', 'Просмотр всех тендеров и отчётов', 
         ARRAY['tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics', 'employees.view', 'employees.create', 'employees.update', 'reports:view'], 
         '#764ba2', true),
        (company_rec.id, 'Менеджер', 'Управление тендерами', 
         ARRAY['tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:documents', 'employees.view'], 
         '#4facfe', true),
        (company_rec.id, 'Специалист', 'Работа с тендерами', 
         ARRAY['tenders:view', 'tenders:edit', 'tenders:documents', 'employees.view'], 
         '#43e97b', true),
        (company_rec.id, 'Наблюдатель', 'Только просмотр', 
         ARRAY['tenders:view', 'employees.view'], 
         '#6b7280', true);
    END IF;
  END LOOP;
END $$;

-- 9. Миграция существующих employees: связываем role -> role_id
UPDATE employees e
SET role_id = (
  SELECT r.id FROM roles r 
  WHERE r.company_id = e.company_id 
  AND r.name = CASE e.role
    WHEN 'admin' THEN 'Администратор'
    WHEN 'manager' THEN 'Менеджер'
    WHEN 'tender_specialist' THEN 'Специалист'
    WHEN 'accountant' THEN 'Специалист'
    WHEN 'logistics' THEN 'Специалист'
    WHEN 'viewer' THEN 'Наблюдатель'
    ELSE 'Наблюдатель'
  END
  LIMIT 1
)
WHERE e.role_id IS NULL;

-- Комментарии
COMMENT ON COLUMN roles.company_id IS 'ID компании, которой принадлежит роль. NULL для личных ролей пользователя.';
COMMENT ON COLUMN roles.is_system IS 'Системная роль, создаётся автоматически и не может быть удалена.';
COMMENT ON COLUMN employees.role_id IS 'Ссылка на роль сотрудника из таблицы roles.';
