-- Backup Storage Setup
-- Создание bucket для резервных копий

-- Создаём bucket для backups (если не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для bucket backups
-- Пользователи могут работать только со своими backup'ами

-- Политика на чтение: только свои файлы
CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика на создание: только в своей папке
CREATE POLICY "Users can create own backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика на удаление: только свои файлы
CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Комментарий
COMMENT ON TABLE storage.buckets IS 'Storage buckets including backups for user data';
