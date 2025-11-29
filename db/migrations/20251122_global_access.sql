-- Миграция: Глобальное управление доступом
-- Описание: Добавление глобальных ролей и прав доступа к приложениям

-- 0. Создаем таблицу profiles, если её нет (она критически важна)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включаем RLS для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Создаем тип для глобальных ролей
DO $$ BEGIN
    CREATE TYPE global_role AS ENUM ('super_admin', 'admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Расширяем таблицу profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS global_role global_role NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS allowed_apps TEXT[] DEFAULT '{}';

-- Индекс для быстрого поиска админов
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON profiles(global_role);

-- 3. Расширяем таблицу organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';

-- 4. Обновляем RLS политики для profiles

-- Разрешаем чтение профилей:
-- 1. Пользователь видит свой профиль
-- 2. Супер-админ и Админ видят все профили
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON profiles;

CREATE POLICY "Users can view own profile or admins view all" ON profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND global_role IN ('super_admin', 'admin')
    )
  );

-- Разрешаем обновление профилей:
-- 1. Пользователь может обновлять свои базовые поля (но НЕ роль и НЕ доступы)
-- 2. Супер-админ может обновлять всё (кроме понижения себя, это на уровне API проверим)
-- 3. Админ может обновлять пользователей (но не супер-админов)

-- Для начала создадим функцию-триггер, чтобы защитить критические поля от обычных юзеров
CREATE OR REPLACE FUNCTION protect_critical_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Если пользователь меняет сам себя и он не админ
  IF auth.uid() = NEW.id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role IN ('super_admin', 'admin')) THEN
    -- Запрещаем менять global_role
    IF NEW.global_role != OLD.global_role THEN
      RAISE EXCEPTION 'You cannot change your own global role';
    END IF;
    -- Запрещаем менять allowed_apps
    IF NEW.allowed_apps != OLD.allowed_apps THEN
      RAISE EXCEPTION 'You cannot change your own allowed apps';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON profiles;
CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_critical_profile_fields();

-- Политика обновления
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own, Admins update others" ON profiles;

CREATE POLICY "Users update own, Admins update others" ON profiles
  FOR UPDATE USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND global_role IN ('super_admin', 'admin')
    )
  );

-- Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Привязываем триггер к auth.users (если еще нет)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Комментарии
COMMENT ON COLUMN profiles.global_role IS 'Глобальная роль: super_admin (владелец), admin (управляющий), user (обычный)';
COMMENT ON COLUMN profiles.allowed_apps IS 'Список разрешенных модулей: investments, finance, tenders (через орг)';
