-- Миграция: Добавление allowed_modes в роли
-- Это позволяет ограничить доступные режимы для роли

-- 1. Добавляем поле allowed_modes в таблицу roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_modes text[] DEFAULT NULL;

-- 2. Комментарий к полю
COMMENT ON COLUMN roles.allowed_modes IS 'Массив разрешённых режимов (finance, tenders, investments и т.д.). NULL = все режимы доступны.';

-- 3. Создаём системную роль "Админ организации (Тендеры)" для существующих компаний
-- Эта роль даёт полный доступ ТОЛЬКО к режиму тендеров
DO $$
DECLARE
  company_rec RECORD;
BEGIN
  FOR company_rec IN SELECT id FROM companies LOOP
    -- Проверяем, есть ли уже такая роль у компании
    IF NOT EXISTS (
      SELECT 1 FROM roles 
      WHERE company_id = company_rec.id 
      AND name = 'Админ организации (Тендеры)'
    ) THEN
      INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
      VALUES (
        company_rec.id,
        'Админ организации (Тендеры)',
        'Полный доступ к режиму Тендеры. Другие режимы недоступны.',
        ARRAY[
          -- Тендеры: Общие
          'tenders:view', 'tenders:view_all', 'tenders:create', 'tenders:edit', 'tenders:delete',
          'tenders:import', 'tenders:export',
          -- Тендеры: Этапы
          'tenders:stages', 'tenders:stages:move_forward', 'tenders:stages:move_backward', 
          'tenders:stages:archive', 'tenders:stages:restore',
          -- Тендеры: Просчёт
          'tenders:calc:view', 'tenders:calc:create', 'tenders:calc:edit', 'tenders:calc:approve',
          'tenders:calc:set_price', 'tenders:calc:view_margin',
          -- Тендеры: Документы
          'tenders:docs:view', 'tenders:docs:upload', 'tenders:docs:delete', 'tenders:docs:download', 'tenders:docs:sign',
          -- Тендеры: Проверка
          'tenders:review:view', 'tenders:review:approve', 'tenders:review:reject', 'tenders:review:comment', 'tenders:review:return',
          -- Тендеры: Торги
          'tenders:auction:view', 'tenders:auction:participate', 'tenders:auction:set_result',
          -- Тендеры: Контракт
          'tenders:contract:view', 'tenders:contract:create', 'tenders:contract:edit', 'tenders:contract:sign', 'tenders:contract:close',
          -- Тендеры: Назначения
          'tenders:assign:manager', 'tenders:assign:specialist', 'tenders:assign:calculator', 'tenders:assign:reviewer', 'tenders:assign:executor',
          -- Тендеры: Аналитика
          'tenders:analytics:view', 'tenders:analytics:reports', 'tenders:analytics:kpi', 'tenders:analytics:finance',
          -- Сотрудники (для просмотра команды)
          'employees:view', 'employees:view_all', 'employees:create', 'employees:edit', 'employees:invite',
          -- Администрирование организации
          'admin:view', 'users:manage', 'roles:manage', 'org:settings'
        ],
        '#e11d48',  -- Красный цвет для выделения
        true,       -- Системная роль
        ARRAY['tenders']  -- Только режим тендеров
      );
    END IF;
  END LOOP;
END $$;

-- 4. Обновляем триггер создания ролей при создании компании
CREATE OR REPLACE FUNCTION create_default_company_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Администратор (полный доступ ко всем режимам)
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Администратор',
    'Полный доступ к управлению компанией и всем режимам',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:delete', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics', 'tenders:import',
      'finance:view', 'transactions:view', 'transactions:create', 'transactions:edit', 'transactions:delete',
      'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
      'users:manage', 'roles:manage', 'org:settings', 'audit:view'
    ],
    '#667eea',
    true,
    NULL  -- Все режимы доступны
  );

  -- Админ организации (Тендеры) - только тендеры
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Админ организации (Тендеры)',
    'Полный доступ к режиму Тендеры. Другие режимы недоступны.',
    ARRAY[
      'tenders:view', 'tenders:view_all', 'tenders:create', 'tenders:edit', 'tenders:delete',
      'tenders:import', 'tenders:export',
      'tenders:stages', 'tenders:stages:move_forward', 'tenders:stages:move_backward', 
      'tenders:stages:archive', 'tenders:stages:restore',
      'tenders:calc:view', 'tenders:calc:create', 'tenders:calc:edit', 'tenders:calc:approve',
      'tenders:calc:set_price', 'tenders:calc:view_margin',
      'tenders:docs:view', 'tenders:docs:upload', 'tenders:docs:delete', 'tenders:docs:download', 'tenders:docs:sign',
      'tenders:review:view', 'tenders:review:approve', 'tenders:review:reject', 'tenders:review:comment', 'tenders:review:return',
      'tenders:auction:view', 'tenders:auction:participate', 'tenders:auction:set_result',
      'tenders:contract:view', 'tenders:contract:create', 'tenders:contract:edit', 'tenders:contract:sign', 'tenders:contract:close',
      'tenders:assign:manager', 'tenders:assign:specialist', 'tenders:assign:calculator', 'tenders:assign:reviewer', 'tenders:assign:executor',
      'tenders:analytics:view', 'tenders:analytics:reports', 'tenders:analytics:kpi', 'tenders:analytics:finance',
      'employees:view', 'employees:view_all', 'employees:create', 'employees:edit', 'employees:invite',
      'admin:view', 'users:manage', 'roles:manage', 'org:settings'
    ],
    '#e11d48',
    true,
    ARRAY['tenders']
  );

  -- Руководитель
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Руководитель',
    'Просмотр всех тендеров и отчётов, управление командой',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:assign', 'tenders:documents', 'tenders:analytics',
      'employees:view', 'employees:create', 'employees:edit',
      'reports:view', 'reports:export'
    ],
    '#764ba2',
    true,
    NULL
  );

  -- Менеджер
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Менеджер',
    'Управление тендерами, подготовка документации',
    ARRAY[
      'tenders:view', 'tenders:create', 'tenders:edit', 'tenders:stages', 'tenders:documents',
      'employees:view'
    ],
    '#4facfe',
    true,
    NULL
  );

  -- Специалист
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Специалист',
    'Работа с назначенными тендерами',
    ARRAY[
      'tenders:view', 'tenders:edit', 'tenders:documents',
      'employees:view'
    ],
    '#43e97b',
    true,
    NULL
  );

  -- Наблюдатель
  INSERT INTO roles (company_id, name, description, permissions, color, is_system, allowed_modes)
  VALUES (
    NEW.id,
    'Наблюдатель',
    'Только просмотр информации',
    ARRAY['tenders:view', 'employees:view'],
    '#6b7280',
    true,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
