-- Миграция: Система организаций и компаний
-- Дата: 2025-11-10
-- Описание: Создание многоуровневой организационной структуры

-- ============================================================
-- 1. ОРГАНИЗАЦИИ
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  
  -- Настройки
  settings JSONB DEFAULT '{
    "features": {
      "tenders": true,
      "analytics": true,
      "reports": true
    },
    "limits": {
      "max_companies": 10,
      "max_users_per_company": 50
    }
  }'::jsonb,
  
  -- Контакты
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Адрес
  address JSONB,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. КОМПАНИИ (ЧЛЕНЫ ОРГАНИЗАЦИИ)
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Основная информация
  name TEXT NOT NULL,
  full_name TEXT,
  logo_url TEXT,
  
  -- Реквизиты
  inn TEXT,
  kpp TEXT,
  ogrn TEXT,
  legal_address TEXT,
  actual_address TEXT,
  
  -- Настройки компании
  settings JSONB DEFAULT '{
    "notifications": {
      "email": true,
      "push": false
    },
    "features": {
      "tender_import": true,
      "auto_categorization": false
    }
  }'::jsonb,
  
  -- Контакты
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Ограничение: уникальное имя в рамках организации
  UNIQUE(organization_id, name)
);

-- Индексы
CREATE INDEX idx_companies_organization_id ON companies(organization_id);
CREATE INDEX idx_companies_status ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_inn ON companies(inn) WHERE inn IS NOT NULL;
CREATE INDEX idx_companies_created_at ON companies(created_at);

-- Триггер обновления updated_at
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. ЧЛЕНЫ КОМПАНИИ (СОТРУДНИКИ)
-- ============================================================

CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Роль в компании
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'specialist', 'viewer')),
  
  -- Права доступа (расширяемые)
  permissions JSONB DEFAULT '{
    "tenders": {
      "create": false,
      "read": true,
      "update": false,
      "delete": false
    },
    "reports": {
      "view": true,
      "export": false
    },
    "settings": {
      "manage": false
    }
  }'::jsonb,
  
  -- Кто пригласил
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Дата присоединения
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'left')),
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ограничение: пользователь может быть в компании только один раз
  UNIQUE(company_id, user_id)
);

-- Индексы
CREATE INDEX idx_company_members_company_id ON company_members(company_id);
CREATE INDEX idx_company_members_user_id ON company_members(user_id);
CREATE INDEX idx_company_members_role ON company_members(role);
CREATE INDEX idx_company_members_status ON company_members(status);

-- Триггер обновления updated_at
CREATE TRIGGER company_members_updated_at
  BEFORE UPDATE ON company_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ПРИГЛАШЕНИЯ В КОМПАНИЮ
-- ============================================================

CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Email приглашенного
  email TEXT NOT NULL,
  
  -- Роль
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'specialist', 'viewer')),
  
  -- Кто пригласил
  invited_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Токен для принятия приглашения
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
  
  -- Срок действия
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  
  -- Принято пользователем
  accepted_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ограничение: одно активное приглашение на email в компании
  UNIQUE(company_id, email, status) WHERE status = 'pending'
);

-- Индексы
CREATE INDEX idx_company_invitations_company_id ON company_invitations(company_id);
CREATE INDEX idx_company_invitations_email ON company_invitations(email);
CREATE INDEX idx_company_invitations_token ON company_invitations(token);
CREATE INDEX idx_company_invitations_status ON company_invitations(status);
CREATE INDEX idx_company_invitations_expires_at ON company_invitations(expires_at);

-- ============================================================
-- 5. RLS ПОЛИТИКИ
-- ============================================================

-- Включаем RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Политики для organizations
-- Супер-админы видят все
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'super_admin' = ANY(profiles.roles)
    )
  );

-- Супер-админы могут создавать организации
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'super_admin' = ANY(profiles.roles)
    )
  );

-- Супер-админы могут обновлять организации
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'super_admin' = ANY(profiles.roles)
    )
  );

-- Политики для companies
-- Пользователи видят компании своей организации
CREATE POLICY "Users can view companies in their organization"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Админы компании могут обновлять свою компанию
CREATE POLICY "Company admins can update their company"
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'admin'
      AND company_members.status = 'active'
    )
  );

-- Политики для company_members
-- Члены компании видят других членов своей компании
CREATE POLICY "Members can view other members in their company"
  ON company_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members AS cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Админы компании могут добавлять членов
CREATE POLICY "Company admins can add members"
  ON company_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members AS cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'active'
    )
  );

-- Админы компании могут обновлять членов
CREATE POLICY "Company admins can update members"
  ON company_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_members AS cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'active'
    )
  );

-- Политики для company_invitations
-- Члены компании видят приглашения своей компании
CREATE POLICY "Members can view invitations in their company"
  ON company_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_invitations.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Админы могут создавать приглашения
CREATE POLICY "Company admins can create invitations"
  ON company_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_invitations.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'admin'
      AND company_members.status = 'active'
    )
  );

-- ============================================================
-- 6. ФУНКЦИИ HELPER
-- ============================================================

-- Функция получения роли пользователя в компании
CREATE OR REPLACE FUNCTION get_user_company_role(p_company_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM company_members
  WHERE company_id = p_company_id
  AND user_id = p_user_id
  AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Функция проверки права доступа
CREATE OR REPLACE FUNCTION check_user_permission(
  p_company_id UUID,
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
  SELECT 
    CASE 
      WHEN role = 'admin' THEN TRUE
      WHEN jsonb_extract_path_text(permissions, p_resource, p_action) = 'true' THEN TRUE
      ELSE FALSE
    END
  FROM company_members
  WHERE company_id = p_company_id
  AND user_id = p_user_id
  AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- 7. КОММЕНТАРИИ
-- ============================================================

COMMENT ON TABLE organizations IS 'Организации верхнего уровня';
COMMENT ON TABLE companies IS 'Компании-члены организации';
COMMENT ON TABLE company_members IS 'Сотрудники компаний с ролями и правами';
COMMENT ON TABLE company_invitations IS 'Приглашения новых сотрудников в компанию';

COMMENT ON COLUMN company_members.role IS 'Роль: admin, manager, specialist, viewer';
COMMENT ON COLUMN company_members.permissions IS 'JSONB с детальными правами доступа';
