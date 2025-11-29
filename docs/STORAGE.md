# 📦 Supabase Storage — Полная документация

> **Статус:** ✅ Production Ready

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Настройка](#настройка)
3. [RLS политики](#rls-политики)
4. [Компоненты](#компоненты)
5. [Использование](#использование)
6. [Безопасность](#безопасность)
7. [Troubleshooting](#troubleshooting)

---

## Обзор

### Созданная инфраструктура

- ✅ Bucket `attachments` (10MB limit, private)
- ✅ Bucket `backups` (50MB limit, private)
- ✅ 4 RLS политики для каждого bucket
- ✅ Структура папок: `{user_id}/filename`

### Структура хранения

```
attachments/
├── {user_id_1}/
│   ├── {transaction_id_1}/
│   │   ├── 1698765432.jpg
│   │   └── 1698765433.pdf
│   └── {transaction_id_2}/
│       └── 1698765434.png
└── {user_id_2}/
    └── ...
```

---

## Настройка

### Вариант A: Автоматическая (рекомендуется)

```bash
node scripts/setup-storage.js
```

Скрипт:
- ✅ Создаст bucket "attachments"
- ✅ Покажет политики для создания
- ✅ Проверит настройку

### Вариант B: Ручная

1. Откройте https://supabase.com/dashboard
2. Выберите проект → **Storage**
3. Нажмите **New bucket**

**Настройки:**
- **Name:** `attachments`
- **Public:** ❌ NO (приватный)
- **Maximum file size:** 10 MB

---

## RLS политики

### 1. Политика загрузки (INSERT)

```sql
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 2. Политика просмотра (SELECT)

```sql
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Политика обновления (UPDATE)

```sql
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Политика удаления (DELETE)

```sql
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Компоненты

### FileUpload

`components/transactions/FileUpload.tsx`

**Функции:**
- Загрузка файлов с drag & drop
- Валидация размера (макс. 10MB)
- Прогресс загрузки
- Preview загруженных файлов
- Удаление файлов

**Использование:**

```tsx
import { FileUpload } from '@/components/transactions/FileUpload';

<FileUpload
  transactionId="123e4567-e89b-12d3-a456-426614174000"
  maxSizeMB={10}
  accept="image/*,.pdf"
  onUploadComplete={(path, data) => {
    console.log('Файл загружен:', path, data);
  }}
/>
```

### AttachmentsList

`components/transactions/AttachmentsList.tsx`

**Функции:**
- Отображение всех вложений транзакции
- Preview изображений
- Скачивание файлов
- Удаление файлов

**Использование:**

```tsx
import { AttachmentsList } from '@/components/transactions/AttachmentsList';

<AttachmentsList
  transactionId="123e4567-e89b-12d3-a456-426614174000"
  onDelete={(id) => {
    console.log('Вложение удалено:', id);
  }}
/>
```

---

## Использование

### Интеграция в транзакции

```tsx
import { FileUpload } from '@/components/transactions/FileUpload';
import { AttachmentsList } from '@/components/transactions/AttachmentsList';

// В форме добавления транзакции:
<div className="attachments-section">
  <h3>Вложения</h3>
  <FileUpload
    transactionId={newTransactionId}
    maxSizeMB={10}
    onUploadComplete={(path, data) => {
      console.log('Файл загружен:', data.name);
    }}
  />
</div>

// В модальном окне просмотра транзакции:
<div className="attachments-view">
  <AttachmentsList transactionId={selectedTransaction.id} />
</div>
```

### Программная загрузка

```typescript
const supabase = createClientComponentClient();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Upload file
const fileName = `${user.id}/${Date.now()}-${file.name}`;
const { data, error } = await supabase.storage
  .from('attachments')
  .upload(fileName, file);

// Save to database
await supabase.from('attachments').insert({
  user_id: user.id,
  file_name: file.name,
  file_path: data.path,
  file_size: file.size,
  mime_type: file.type
});
```

---

## Безопасность

### Что реализовано

✅ **Приватный bucket** — файлы недоступны публично  
✅ **RLS политики** — пользователи видят только свои файлы  
✅ **Валидация типов** — только изображения и PDF  
✅ **Валидация размера** — максимум 10 MB  
✅ **Проверка владельца** — в API endpoints

### Структура безопасности

```
Запрос на файл
    ↓
API endpoint проверяет user_id
    ↓
Storage RLS проверяет путь файла
    ↓
Файл возвращается только владельцу
```

### Что пользователи могут

✅ Загружать файлы в `{their_user_id}/`  
✅ Просматривать свои файлы  
✅ Удалять свои файлы

### Что пользователи НЕ могут

❌ Доступ к файлам других пользователей  
❌ Загрузка в чужие папки  
❌ Просмотр файлов вне своей папки

---

## Квоты и лимиты

### Supabase Free Tier

- **Storage:** 1 GB
- **Bandwidth:** 2 GB/месяц

### Supabase Pro ($25/месяц)

- **Storage:** 100 GB
- **Bandwidth:** 200 GB/месяц

### Расчёт использования

- Средний размер чека: ~500 KB
- 1 GB хватит на: ~2000 чеков

---

## Troubleshooting

### "Bucket not found"

1. Проверьте название bucket (должно быть `attachments`)
2. Создайте bucket если его нет

### "Access denied"

1. Проверьте RLS политики
2. Убедитесь что пользователь авторизован
3. Проверьте что путь начинается с user_id

### "File too large"

1. Увеличьте MAX_FILE_SIZE в коде
2. Или оптимизируйте изображения перед загрузкой

### "Storage full"

1. Удалите старые файлы
2. Или обновите план Supabase

---

## База данных

### Таблица attachments

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_transaction_id ON attachments(transaction_id);
```

---

## Настройки

### Изменить максимальный размер

```typescript
// components/attachments/FileUploader.tsx
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
```

### Добавить новые типы файлов

```typescript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
```

---

**Storage полностью готов к использованию!** 🚀
