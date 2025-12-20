-- Добавление поля блокировки организации
-- Супер-админ может заблокировать любую организацию (кроме личного пространства)

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES auth.users(id);

-- Комментарии
COMMENT ON COLUMN organizations.is_blocked IS 'Организация заблокирована супер-админом';
COMMENT ON COLUMN organizations.blocked_at IS 'Дата блокировки';
COMMENT ON COLUMN organizations.blocked_reason IS 'Причина блокировки';
COMMENT ON COLUMN organizations.blocked_by IS 'Кто заблокировал';

-- Индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_organizations_is_blocked ON organizations(is_blocked) WHERE is_blocked = true;
