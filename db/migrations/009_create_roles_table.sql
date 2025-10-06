-- Создание таблицы ролей
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  permissions text[] NOT NULL DEFAULT '{}',
  color text NOT NULL DEFAULT '#667eea',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS roles_user_id_idx ON roles(user_id);
CREATE INDEX IF NOT EXISTS roles_is_default_idx ON roles(is_default);

-- RLS политики
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои роли
CREATE POLICY "Users can view own roles" ON roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут создавать свои роли
CREATE POLICY "Users can create own roles" ON roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять свои роли
CREATE POLICY "Users can update own roles" ON roles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи могут удалять свои роли (кроме системных)
CREATE POLICY "Users can delete own roles" ON roles
  FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- Триггер для updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка системных ролей по умолчанию
-- Эти роли можно создать для демонстрации, но они будут привязаны к конкретному пользователю

COMMENT ON TABLE roles IS 'Роли пользователей с настраиваемыми правами доступа';
COMMENT ON COLUMN roles.permissions IS 'Массив разрешений в формате category:action (например, transactions:create)';
COMMENT ON COLUMN roles.is_default IS 'Системная роль, которую нельзя удалить';
