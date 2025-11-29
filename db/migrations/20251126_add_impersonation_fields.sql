-- Добавляем поля для имперсонации (вход под другим пользователем)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS impersonating_user_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS impersonating_user_name text;

-- Комментарии
COMMENT ON COLUMN profiles.impersonating_user_id IS 'ID пользователя, под которым работает супер-админ';
COMMENT ON COLUMN profiles.impersonating_user_name IS 'Имя пользователя для отображения в баннере';
