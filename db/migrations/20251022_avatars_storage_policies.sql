-- Миграция: RLS политики для bucket 'avatars'
-- Дата: 2025-10-22
-- Описание: Настройка безопасности для загрузки аватаров пользователей

-- Политика: Пользователи могут загружать свои аватары
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика: Пользователи могут обновлять свои аватары
CREATE POLICY IF NOT EXISTS "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика: Пользователи могут удалять свои аватары
CREATE POLICY IF NOT EXISTS "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика: Все могут просматривать аватары (публичный доступ)
CREATE POLICY IF NOT EXISTS "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
