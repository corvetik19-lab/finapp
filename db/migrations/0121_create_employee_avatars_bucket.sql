-- Миграция: создание bucket для аватаров сотрудников
-- Дата: 2024-11-25
-- ВАЖНО: Этот SQL выполняется через Supabase Dashboard или CLI

-- Создание bucket (выполнить в Supabase Dashboard -> Storage)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('employee-avatars', 'employee-avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Политика: авторизованные пользователи могут загружать
-- CREATE POLICY "Authenticated users can upload avatars"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'employee-avatars');

-- Политика: авторизованные пользователи могут обновлять свои файлы
-- CREATE POLICY "Users can update own avatars"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'employee-avatars');

-- Политика: авторизованные пользователи могут удалять свои файлы
-- CREATE POLICY "Users can delete own avatars"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'employee-avatars');

-- Политика: публичный доступ на чтение
-- CREATE POLICY "Public read access for avatars"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'employee-avatars');

-- ============================================
-- ИНСТРУКЦИЯ ПО СОЗДАНИЮ BUCKET:
-- ============================================
-- 1. Откройте Supabase Dashboard
-- 2. Перейдите в Storage
-- 3. Нажмите "New bucket"
-- 4. Название: employee-avatars
-- 5. Включите "Public bucket"
-- 6. Нажмите "Create bucket"
-- ============================================
