# 📦 Настройка Supabase Storage для вложений

**Дата:** 2025-10-20  
**Версия:** 1.0

Инструкция по настройке Supabase Storage для загрузки чеков и других файлов к транзакциям.

---

## 🚀 Шаги настройки

### **Вариант A: Автоматическая настройка (рекомендуется)** 🤖

Используйте скрипт для автоматического создания bucket:

```bash
node scripts/setup-storage.js
```

Скрипт:
- ✅ Создаст bucket "attachments"
- ✅ Покажет политики для создания
- ✅ Проверит настройку

📚 Подробнее: `docs/STORAGE_AUTO_SETUP.md`

---

### **Вариант B: Ручная настройка** 🖱️

### **Шаг 1: Создайте bucket в Supabase**

1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. В левом меню нажмите **Storage**
4. Нажмите **New bucket**

**Настройки bucket:**
- **Name:** `attachments`
- **Public:** ❌ **NO** (частный bucket для безопасности)
- **Allowed MIME types:** Оставьте пустым (проверяем на уровне API)
- **Maximum file size:** 10 MB

5. Нажмите **Create bucket**

---

### **Шаг 2: Настройте политики доступа (RLS)**

Перейдите в **Storage → Policies** и создайте политики:

#### **1. Политика загрузки (INSERT):**

```sql
-- Пользователи могут загружать файлы в свою папку
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### **2. Политика просмотра (SELECT):**

```sql
-- Пользователи могут просматривать свои файлы
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### **3. Политика удаления (DELETE):**

```sql
-- Пользователи могут удалять свои файлы
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

### **Шаг 3: Проверьте структуру папок**

Файлы будут храниться в следующей структуре:

```
attachments/
├── <user_id_1>/
│   ├── <transaction_id_1>/
│   │   ├── 1698765432.jpg
│   │   └── 1698765433.pdf
│   └── <transaction_id_2>/
│       └── 1698765434.png
└── <user_id_2>/
    └── <transaction_id_3>/
        └── 1698765435.jpg
```

Это обеспечивает:
- ✅ Изоляцию файлов по пользователям
- ✅ Группировку по транзакциям
- ✅ Уникальность имён файлов (timestamp)

---

## 🧪 Тестирование

### **1. Проверьте bucket:**

```sql
-- Проверьте что bucket создан
SELECT * FROM storage.buckets WHERE name = 'attachments';
```

### **2. Проверьте политики:**

```sql
-- Посмотрите все политики
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

### **3. Загрузите тестовый файл:**

В приложении:
1. Откройте любую транзакцию
2. Нажмите "Прикрепить файл"
3. Выберите изображение или PDF
4. Дождитесь загрузки

В Supabase Dashboard:
1. Storage → attachments
2. Увидите папку с вашим user_id
3. Внутри папка с transaction_id
4. Внутри загруженный файл

---

## 🔒 Безопасность

### **Что реализовано:**

✅ **Приватный bucket** - файлы недоступны публично  
✅ **RLS политики** - пользователи видят только свои файлы  
✅ **Валидация типов** - только изображения и PDF  
✅ **Валидация размера** - максимум 10 MB  
✅ **Проверка владельца** - в API endpoints  

### **Структура безопасности:**

```
Запрос на файл
    ↓
API endpoint проверяет user_id
    ↓
Storage RLS проверяет путь файла
    ↓
Файл возвращается только владельцу
```

---

## ⚙️ Настройка ограничений

### **Изменить максимальный размер:**

В файле `components/attachments/FileUploader.tsx`:

```typescript
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB вместо 10MB
```

### **Добавить новые типы файлов:**

```typescript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',        // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];
```

---

## 📊 Квоты и лимиты

### **Supabase Free Tier:**
- **Storage:** 1 GB
- **Bandwidth:** 2 GB/месяц
- **Requests:** Неограничено

### **Supabase Pro ($25/месяц):**
- **Storage:** 100 GB
- **Bandwidth:** 200 GB/месяц
- **Requests:** Неограничено

### **Расчёт использования:**

**Средний размер чека:** ~500 KB  
**1 GB хватит на:** ~2000 чеков  
**Пользователей:** Зависит от активности

---

## 🧹 Очистка старых файлов (опционально)

### **Ручное удаление через SQL:**

```sql
-- Удалить вложения старше 1 года
DELETE FROM attachments
WHERE created_at < NOW() - INTERVAL '1 year';

-- Удалить файлы удалённых транзакций
DELETE FROM attachments
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE deleted_at IS NOT NULL
);
```

### **Автоматическая очистка (CRON):**

Можно настроить CRON задачу для автоматического удаления старых файлов.

---

## 🐛 Решение проблем

### **Проблема: "Bucket not found"**

**Решение:**
1. Проверьте название bucket (должно быть `attachments`)
2. Создайте bucket если его нет

### **Проблема: "Access denied"**

**Решение:**
1. Проверьте RLS политики
2. Убедитесь что пользователь авторизован
3. Проверьте что путь начинается с user_id

### **Проблема: "File too large"**

**Решение:**
1. Увеличьте MAX_FILE_SIZE в коде
2. Или оптимизируйте изображения перед загрузкой

### **Проблема: "Storage full"**

**Решение:**
1. Удалите старые файлы
2. Или обновите план Supabase

---

## 📈 Мониторинг использования

### **Проверить размер хранилища:**

```sql
-- Общий размер всех файлов
SELECT 
  COUNT(*) as total_files,
  SUM(file_size) as total_size_bytes,
  pg_size_pretty(SUM(file_size)::bigint) as total_size_human
FROM attachments;

-- По пользователям
SELECT 
  user_id,
  COUNT(*) as files_count,
  pg_size_pretty(SUM(file_size)::bigint) as total_size
FROM attachments
GROUP BY user_id
ORDER BY SUM(file_size) DESC
LIMIT 10;
```

### **В Supabase Dashboard:**

1. Storage → attachments
2. Справа вверху отображается использование

---

## 🔗 Интеграция с транзакциями

### **В форме создания/редактирования транзакции:**

```tsx
import FileUploader from '@/components/attachments/FileUploader';

// В компоненте формы
<FileUploader
  transactionId={transaction.id}
  existingFiles={transaction.attachments}
  onUploadComplete={(file) => {
    console.log('Uploaded:', file);
  }}
  onDeleteComplete={(fileId) => {
    console.log('Deleted:', fileId);
  }}
/>
```

### **В списке транзакций показывать иконку:**

```tsx
{transaction.attachment_count > 0 && (
  <span title={`${transaction.attachment_count} файлов`}>
    📎 {transaction.attachment_count}
  </span>
)}
```

---

## 📚 См. также

- `components/attachments/FileUploader.tsx` - компонент
- `app/api/attachments/*` - API endpoints
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

---

**Автор:** AI Assistant  
**Дата:** 2025-10-20  
**Версия:** 1.0
