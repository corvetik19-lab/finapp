-- Миграция: Добавление ролей для модулей
-- Дата: 2025-12-14
-- Описание: Добавление новых ролей для модулей Бухгалтерия и Поставщики

-- ============================================================
-- 1. ОБНОВЛЕНИЕ ОГРАНИЧЕНИЯ РОЛЕЙ В company_members
-- ============================================================

-- Удаляем старое ограничение
ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_role_check;

-- Добавляем новое с расширенным списком ролей
ALTER TABLE company_members ADD CONSTRAINT company_members_role_check 
  CHECK (role IN (
    'admin',           -- Администратор организации (полный доступ)
    'manager',         -- Менеджер (доступ к тендерам, поставщикам)
    'specialist',      -- Специалист (базовый доступ)
    'viewer',          -- Наблюдатель (только просмотр)
    'accountant',      -- Бухгалтер (доступ к бухгалтерии)
    'supplier_manager' -- Менеджер поставщиков (доступ к поставщикам)
  ));

-- ============================================================
-- 2. ОБНОВЛЕНИЕ ОГРАНИЧЕНИЯ РОЛЕЙ В company_invitations
-- ============================================================

ALTER TABLE company_invitations DROP CONSTRAINT IF EXISTS company_invitations_role_check;

ALTER TABLE company_invitations ADD CONSTRAINT company_invitations_role_check 
  CHECK (role IN (
    'admin',
    'manager', 
    'specialist',
    'viewer',
    'accountant',
    'supplier_manager'
  ));

-- ============================================================
-- 3. СОЗДАНИЕ ТАБЛИЦЫ КОНФИГУРАЦИИ РОЛЕЙ
-- ============================================================

CREATE TABLE IF NOT EXISTS role_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  
  -- Доступ к модулям
  allowed_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Порядок сортировки
  sort_order INT DEFAULT 0,
  
  -- Активна ли роль
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_role_configs_role_key ON role_configs(role_key);
CREATE INDEX IF NOT EXISTS idx_role_configs_is_active ON role_configs(is_active);

-- Триггер обновления updated_at
DROP TRIGGER IF EXISTS role_configs_updated_at ON role_configs;
CREATE TRIGGER role_configs_updated_at
  BEFORE UPDATE ON role_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ЗАПОЛНЕНИЕ КОНФИГУРАЦИИ РОЛЕЙ
-- ============================================================

INSERT INTO role_configs (role_key, name, description, icon, color, allowed_modules, sort_order) VALUES
  ('super_admin', 'Супер-администратор', 'Полный доступ ко всей платформе', '👑', '#9333EA', ARRAY['*'], 0),
  ('admin', 'Администратор', 'Полный доступ к организации', '🔧', '#3B82F6', ARRAY['tenders', 'suppliers', 'accounting', 'finance', 'personal', 'investments'], 1),
  ('manager', 'Менеджер', 'Управление тендерами и поставщиками', '📋', '#10B981', ARRAY['tenders', 'suppliers'], 2),
  ('accountant', 'Бухгалтер', 'Доступ к бухгалтерии и документам', '📊', '#F59E0B', ARRAY['accounting'], 3),
  ('supplier_manager', 'Менеджер поставщиков', 'Управление базой поставщиков', '🏭', '#6366F1', ARRAY['suppliers'], 4),
  ('specialist', 'Специалист', 'Базовый доступ к тендерам', '👤', '#64748B', ARRAY['tenders'], 5),
  ('viewer', 'Наблюдатель', 'Только просмотр', '👁️', '#94A3B8', ARRAY[]::TEXT[], 6)
ON CONFLICT (role_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  allowed_modules = EXCLUDED.allowed_modules,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 5. RLS ПОЛИТИКИ ДЛЯ role_configs
-- ============================================================

ALTER TABLE role_configs ENABLE ROW LEVEL SECURITY;

-- Все авторизованные пользователи могут читать конфигурацию ролей
CREATE POLICY "Anyone can read role configs"
  ON role_configs FOR SELECT
  USING (TRUE);

-- Только супер-админы могут изменять
CREATE POLICY "Super admins can manage role configs"
  ON role_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'super_admin'
    )
  );

-- ============================================================
-- 6. КОММЕНТАРИИ
-- ============================================================

COMMENT ON TABLE role_configs IS 'Конфигурация ролей с описанием доступа к модулям';
COMMENT ON COLUMN role_configs.role_key IS 'Уникальный ключ роли';
COMMENT ON COLUMN role_configs.allowed_modules IS 'Массив разрешённых модулей (* = все)';
