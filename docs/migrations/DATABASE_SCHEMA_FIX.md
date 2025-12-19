# ✅ DATABASE SCHEMA FIX APPLIED

## 🔧 Проблема:
```
Error: Could not find the 'file_name' column of 'attachments'
```

## 📊 Существующая схема БД:

Таблица `attachments` уже существовала с другими названиями колонок:

| Ожидалось | Фактически |
|-----------|------------|
| `file_name` | ❌ НЕТ |
| `file_path` | `storage_path` |
| `file_size` | `size_bytes` |
| `mime_type` | `mime_type` ✅ |

## ✅ Решение:

Обновил компоненты под существующую схему БД.

---

## 📝 Изменения в FileUpload.tsx:

```tsx
// ❌ Было:
.insert({
  transaction_id: transactionId,
  user_id: user.id,
  file_name: file.name,      // ❌ колонки нет
  file_path: data.path,       // ❌ неверное название
  file_size: file.size,       // ❌ неверное название
  mime_type: file.type
});

// ✅ Стало:
.insert({
  transaction_id: transactionId,
  user_id: user.id,
  storage_path: data.path,    // ✅ правильное название
  size_bytes: file.size,      // ✅ правильное название
  mime_type: file.type
});
```

---

## 📝 Изменения в AttachmentsList.tsx:

### 1. Interface обновлён:
```tsx
interface Attachment {
  id: string;
  storage_path: string | null;  // было: file_path
  size_bytes: number | null;    // было: file_size
  mime_type: string | null;
  created_at: string;
  // file_name удалён (колонки нет)
}
```

### 2. Получение имени файла:
```tsx
// Извлекаем из storage_path
const fileName = attachment.storage_path?.split('/').pop() || 'Файл';
```

### 3. Все методы обновлены:
- `handleDownload()` - использует `storage_path`
- `handleDelete()` - использует `storage_path`
- `getPublicUrl()` - обрабатывает `null`
- Отображение - использует `size_bytes`

---

## 🗄️ Актуальная схема attachments:

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  storage_path TEXT,           -- путь в Storage
  size_bytes INTEGER,           -- размер файла
  mime_type TEXT,               -- тип файла
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### Индексы:
- `idx_attachments_user_id`
- `idx_attachments_transaction_id`
- `idx_attachments_created_at`
- `idx_attachments_deleted_at`

### RLS Policies:
- ✅ Users can view own attachments
- ✅ Users can create own attachments
- ✅ Users can update own attachments
- ✅ Users can delete own attachments

---

## 🚀 Что дальше:

### 1. Проверьте что dev server перезапустился:
```bash
# Если нет - перезапустите:
npm run dev
```

### 2. Протестируйте загрузку:
1. Откройте транзакции
2. Выберите транзакцию → "Редактировать"
3. Прокрутите до "Вложения"
4. Загрузите файл (макс 10MB)
5. **Должно сохраниться в БД!** ✅

### 3. Проверьте в Supabase Dashboard:
```
https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/editor
```

Выполните:
```sql
SELECT * FROM attachments ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ Теперь всё должно работать!

**Компоненты полностью совместимы с существующей схемой БД.**

---

**Дата:** 20 октября 2025, 22:45  
**Статус:** ✅ Schema fixed, ready to test
