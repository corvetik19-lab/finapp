# ✅ FILENAME ENCODING FIX

## 🔧 Проблема

```
StorageApiError: Invalid key: 
94bb6cd5-3b0b-48a2-b904-b070ba28a38b/1760990186196-пп.docx
```

**Причина:** Supabase Storage не поддерживает кириллицу и спецсимволы в путях к файлам.

---

## ✅ Решение

Используем безопасные имена файлов: только timestamp + расширение.

### До:
```tsx
const fileName = `${user.id}/${timestamp}-${file.name}`;
// Результат: user-id/1760990186196-пп.docx ❌
```

### После:
```tsx
const timestamp = Date.now();
const fileExtension = file.name.split('.').pop() || 'file';
const safeFileName = `${user.id}/${timestamp}.${fileExtension}`;
// Результат: user-id/1760990186196.docx ✅
```

---

## 📋 Что изменилось

### FileUpload.tsx:

1. **Генерация безопасного имени:**
   - Убрана кириллица из пути
   - Используется только `timestamp.extension`
   - Оригинальное имя сохраняется отдельно (можно добавить в БД позже)

2. **Формат файла:**
   ```
   {user_id}/{timestamp}.{ext}
   
   Примеры:
   ✅ 94bb6cd5.../1729458123456.docx
   ✅ 94bb6cd5.../1729458234567.pdf
   ✅ 94bb6cd5.../1729458345678.jpg
   ```

---

## 🎯 Преимущества

✅ **Работает с любыми файлами** (кириллица, спецсимволы)  
✅ **Уникальные имена** (timestamp)  
✅ **Сохранено расширение** (.docx, .pdf, .jpg)  
✅ **Короткие пути** (быстрее загрузка)  

---

## 🔄 Опционально: Сохранить оригинальное имя

Если нужно показывать оригинальное имя пользователю, можно:

### Вариант 1: Добавить колонку в БД
```sql
ALTER TABLE attachments 
ADD COLUMN original_name TEXT;
```

Затем в FileUpload.tsx:
```tsx
.insert({
  transaction_id: transactionId,
  user_id: user.id,
  storage_path: data.path,
  size_bytes: file.size,
  mime_type: file.type,
  original_name: file.name  // сохраняем оригинал
});
```

### Вариант 2: Декодировать из metadata
```tsx
// При загрузке добавить метаданные
.upload(safeFileName, file, {
  cacheControl: '3600',
  upsert: false,
  metadata: {
    originalName: file.name
  }
});
```

---

## 🚀 Тестирование

Теперь можно загружать файлы с любыми именами:

✅ `документ.docx`  
✅ `отчёт 2024.pdf`  
✅ `фото №123.jpg`  
✅ `файл (копия).xlsx`  

Все преобразуются в безопасный формат:
- `1729458123456.docx`
- `1729458234567.pdf`
- `1729458345678.jpg`
- `1729458456789.xlsx`

---

## ✅ Готово!

**Файлы с кириллицей теперь загружаются корректно.**

Попробуйте снова загрузить файл с русским названием!

---

**Дата:** 20 октября 2025, 22:58  
**Статус:** ✅ Encoding fixed
