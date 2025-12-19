# 💾 Настройка Storage для Backup

Storage bucket для резервных копий нужно создать через Supabase Dashboard.

## Шаги настройки:

### 1. Откройте Supabase Dashboard
https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/buckets

### 2. Создайте новый bucket

- Нажмите **"New bucket"**
- **Name:** `backups`
- **Public:** ❌ OFF (приватный bucket)
- Нажмите **"Create bucket"**

### 3. Настройте RLS политики

Перейдите в **Policies** для bucket `backups` и добавьте:

#### Политика 1: SELECT (чтение)
```sql
CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Политика 2: INSERT (создание)
```sql
CREATE POLICY "Users can create own backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Политика 3: DELETE (удаление)

```sql
CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backups' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Проверка

После настройки проверьте:
1. Bucket `backups` отображается в списке
2. Все 3 политики активны
3. Public access = OFF

## Структура папок

Backup'ы будут храниться в структуре:
```
backups/
  ├── {user_id}/
  │   ├── backup-2025-10-11T20-30-00.json
  │   ├── backup-2025-10-04T20-30-00.json
  │   └── ...
```

## Автоматическая очистка

CRON задача автоматически удаляет старые backup'ы, оставляя последние 5 для каждого пользователя.

## Готово! ✅

После настройки Storage функция резервного копирования будет полностью работать.
