-- Миграция: Система управления сотрудниками
-- Описание: Создание таблиц для управления сотрудниками, их профилями и ролями

-- =====================================================
-- 1. ENUM типы для ролей и статусов
-- =====================================================

CREATE TYPE employee_role AS ENUM (
  'admin',              -- Администратор (полный доступ)
  'manager',            -- Менеджер (управление тендерами)
  'tender_specialist',  -- Тендерный специалист
  'accountant',         -- Бухгалтер
  'logistics',          -- Логист
  'viewer'              -- Наблюдатель (только просмотр)
);

CREATE TYPE employee_status AS ENUM (
  'active',    -- Активный
  'inactive',  -- Неактивный
  'vacation',  -- В отпуске
  'dismissed'  -- Уволен
);

-- =====================================================
-- 2. Таблица сотрудников (расширение auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Персональные данные
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  telegram TEXT,
  birth_date DATE,
  avatar_url TEXT,
  
  -- Рабочие данные
  position TEXT, -- Должность
  department TEXT, -- Отдел
  employee_number TEXT, -- Табельный номер
  hire_date DATE, -- Дата приема на работу
  dismissal_date DATE, -- Дата увольнения
  
  -- Роли и доступ
  role employee_role NOT NULL DEFAULT 'viewer',
  status employee_status NOT NULL DEFAULT 'active',
  permissions JSONB DEFAULT '{}', -- Дополнительные права
  
  -- Контактная информация
  address TEXT,
  emergency_contact TEXT, -- Контакт для экстренной связи
  emergency_phone TEXT,
  
  -- Рабочие параметры
  salary_amount BIGINT, -- Зарплата в копейках
  work_schedule TEXT, -- График работы
  notes TEXT, -- Заметки
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  
  -- Ограничения
  CONSTRAINT unique_user_company UNIQUE(user_id, company_id),
  CONSTRAINT unique_email_company UNIQUE(email, company_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_employees_company ON employees(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_user ON employees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_email ON employees(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_role ON employees(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status ON employees(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_full_name ON employees USING gin(to_tsvector('russian', full_name));

-- =====================================================
-- 3. Таблица истории изменений сотрудников
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'created', 'updated', 'role_changed', 'status_changed'
  changes JSONB NOT NULL, -- Что изменилось
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  comment TEXT -- Комментарий к изменению
);

CREATE INDEX idx_employee_history_employee ON employee_history(employee_id);
CREATE INDEX idx_employee_history_company ON employee_history(company_id);
CREATE INDEX idx_employee_history_date ON employee_history(changed_at DESC);

-- =====================================================
-- 4. Таблица навыков и компетенций
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  skill_name TEXT NOT NULL,
  skill_level INTEGER CHECK (skill_level BETWEEN 1 AND 5), -- 1-5 уровень владения
  description TEXT,
  verified_by UUID REFERENCES auth.users(id), -- Кто подтвердил навык
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_company ON employee_skills(company_id);

-- =====================================================
-- 5. RLS (Row Level Security) политики
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;

-- Политика для employees: пользователь видит только сотрудников своей компании
CREATE POLICY employees_select_policy ON employees
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Политика для employees: только админы и менеджеры могут создавать
CREATE POLICY employees_insert_policy ON employees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND company_id = employees.company_id
        AND role IN ('admin', 'manager')
        AND deleted_at IS NULL
    )
  );

-- Политика для employees: только админы и менеджеры могут обновлять
CREATE POLICY employees_update_policy ON employees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND company_id = employees.company_id
        AND role IN ('admin', 'manager')
        AND deleted_at IS NULL
    )
  );

-- Политика для employees: только админы могут удалять
CREATE POLICY employees_delete_policy ON employees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND company_id = employees.company_id
        AND role = 'admin'
        AND deleted_at IS NULL
    )
  );

-- Политики для employee_history
CREATE POLICY employee_history_select_policy ON employee_history
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY employee_history_insert_policy ON employee_history
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Политики для employee_skills
CREATE POLICY employee_skills_select_policy ON employee_skills
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY employee_skills_insert_policy ON employee_skills
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE company_id IN (
        SELECT company_id FROM employees WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 6. Триггеры для автоматического обновления
-- =====================================================

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at_trigger
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- Триггер для записи истории изменений
CREATE OR REPLACE FUNCTION log_employee_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO employee_history (employee_id, company_id, action, changes, changed_by)
    VALUES (NEW.id, NEW.company_id, 'created', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Определяем что изменилось
    changes_json := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
    
    -- Определяем тип изменения
    IF OLD.role != NEW.role THEN
      INSERT INTO employee_history (employee_id, company_id, action, changes, changed_by)
      VALUES (NEW.id, NEW.company_id, 'role_changed', changes_json, auth.uid());
    ELSIF OLD.status != NEW.status THEN
      INSERT INTO employee_history (employee_id, company_id, action, changes, changed_by)
      VALUES (NEW.id, NEW.company_id, 'status_changed', changes_json, auth.uid());
    ELSE
      INSERT INTO employee_history (employee_id, company_id, action, changes, changed_by)
      VALUES (NEW.id, NEW.company_id, 'updated', changes_json, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_changes_trigger
  AFTER INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION log_employee_changes();

-- =====================================================
-- 7. Комментарии к таблицам и полям
-- =====================================================

COMMENT ON TABLE employees IS 'Сотрудники компании с профилями и ролями';
COMMENT ON TABLE employee_history IS 'История изменений данных сотрудников';
COMMENT ON TABLE employee_skills IS 'Навыки и компетенции сотрудников';

COMMENT ON COLUMN employees.role IS 'Роль сотрудника в системе (определяет права доступа)';
COMMENT ON COLUMN employees.status IS 'Текущий статус сотрудника';
COMMENT ON COLUMN employees.permissions IS 'Дополнительные права доступа (JSON)';
COMMENT ON COLUMN employees.salary_amount IS 'Зарплата в копейках';
COMMENT ON COLUMN employees.metadata IS 'Дополнительные данные (JSON)';

-- =====================================================
-- 8. Функция для получения статистики по сотрудникам
-- =====================================================

CREATE OR REPLACE FUNCTION get_employees_stats(p_company_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  active_count BIGINT,
  inactive_count BIGINT,
  on_vacation_count BIGINT,
  by_role JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'vacation')::BIGINT,
    jsonb_object_agg(role, role_count) AS by_role
  FROM employees
  LEFT JOIN LATERAL (
    SELECT role, COUNT(*)::BIGINT as role_count
    FROM employees
    WHERE company_id = p_company_id AND deleted_at IS NULL
    GROUP BY role
  ) role_stats ON true
  WHERE company_id = p_company_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
