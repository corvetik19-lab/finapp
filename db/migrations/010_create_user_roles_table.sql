-- Создание таблицы связи пользователей и ролей
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);

-- RLS политики
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть назначения ролей
CREATE POLICY "Users can view role assignments" ON user_roles
  FOR SELECT
  USING (true);

-- Только администраторы могут управлять назначениями ролей
-- (для простоты, пока разрешаем всем аутентифицированным пользователям)
CREATE POLICY "Authenticated users can manage role assignments" ON user_roles
  FOR ALL
  USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE user_roles IS 'Связь пользователей и их ролей';
COMMENT ON COLUMN user_roles.assigned_by IS 'Пользователь который назначил роль';
