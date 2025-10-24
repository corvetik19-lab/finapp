# 📎 Storage Integration - Complete

## ✅ Что создано:

### 1. **Инфраструктура Supabase Storage**
- ✅ Bucket `attachments` (10MB limit, private)
- ✅ Bucket `backups` (50MB limit, private)
- ✅ 4 RLS политики для каждого bucket
- ✅ Безопасная структура папок: `{user_id}/filename`

### 2. **React компоненты**

#### `FileUpload.tsx`
**Путь:** `components/transactions/FileUpload.tsx`

**Функции:**
- Загрузка файлов с drag & drop
- Валидация размера (макс. 10MB)
- Прогресс загрузки
- Preview загруженных файлов
- Удаление файлов
- Автосохранение в БД

**Props:**
```typescript
interface FileUploadProps {
  transactionId?: string;           // ID транзакции (опционально)
  onUploadComplete?: (              // Callback после загрузки
    filePath: string, 
    fileData: {
      name: string;
      size: number;
      type: string;
    }
  ) => void;
  maxSizeMB?: number;                // Макс. размер (default: 10)
  accept?: string;                   // Типы файлов
  className?: string;                // CSS класс
}
```

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

---

#### `AttachmentsList.tsx`
**Путь:** `components/transactions/AttachmentsList.tsx`

**Функции:**
- Отображение всех вложений транзакции
- Preview изображений
- Скачивание файлов
- Удаление файлов
- Grid layout с адаптивностью

**Props:**
```typescript
interface AttachmentsListProps {
  transactionId: string;             // ID транзакции (обязательно)
  onDelete?: (attachmentId: string) => void;  // Callback после удаления
}
```

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

### 3. **Стили**
- `FileUpload.module.css` - стили для загрузки
- `AttachmentsList.module.css` - стили для списка
- Адаптивный дизайн (mobile-first)
- Hover эффекты
- Анимации загрузки

---

## 🔧 Интеграция в транзакции

### Вариант 1: Встроить в форму создания транзакции

Откройте `app/(protected)/transactions/page.tsx`:

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
      // Можно показать уведомление
      console.log('Файл загружен:', data.name);
    }}
  />
</div>

// В модальном окне просмотра транзакции:
<div className="attachments-view">
  <AttachmentsList
    transactionId={selectedTransaction.id}
  />
</div>
```

### Вариант 2: Отдельная вкладка

Создать `/transactions/[id]/attachments`:

```tsx
// app/(protected)/transactions/[id]/attachments/page.tsx
import { FileUpload } from '@/components/transactions/FileUpload';
import { AttachmentsList } from '@/components/transactions/AttachmentsList';

export default function TransactionAttachmentsPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <div className="container">
      <h1>Вложения транзакции</h1>
      
      <section>
        <h2>Загрузить новый файл</h2>
        <FileUpload transactionId={params.id} />
      </section>

      <section>
        <h2>Загруженные файлы</h2>
        <AttachmentsList transactionId={params.id} />
      </section>
    </div>
  );
}
```

---

## 🔐 Безопасность

### RLS Политики
Все файлы защищены Row Level Security:

```sql
-- Пользователи могут загружать только в свою папку
bucket_id = 'attachments' 
AND (storage.foldername(name))[1] = auth.uid()::text

-- Пользователи видят только свои файлы
bucket_id = 'attachments' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

### Структура хранения
```
attachments/
├── {user_id_1}/
│   ├── 1729456789-receipt.pdf
│   ├── 1729456890-invoice.jpg
│   └── ...
├── {user_id_2}/
│   └── ...
```

**Каждый пользователь имеет доступ ТОЛЬКО к своей папке!**

---

## 📊 База данных

Таблица `attachments` уже создана миграцией:

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

-- Индексы для быстрого поиска
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_transaction_id ON attachments(transaction_id);
CREATE INDEX idx_attachments_deleted ON attachments(deleted_at);
```

---

## 🎨 Кастомизация UI

### Изменить максимальный размер

```tsx
<FileUpload maxSizeMB={5} />  // 5MB вместо 10MB
```

### Ограничить типы файлов

```tsx
<FileUpload 
  accept="image/jpeg,image/png,.pdf"  // Только JPEG, PNG, PDF
/>
```

### Стилизация

Можно переопределить стили через CSS:

```css
.customUpload {
  border: 2px solid #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.customUpload:hover {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}
```

```tsx
<FileUpload className="customUpload" />
```

---

## 🧪 Тестирование

### Тест загрузки:
1. Откройте страницу с FileUpload
2. Выберите файл < 10MB
3. Проверьте что файл появился в списке
4. Проверьте в Supabase Dashboard:
   ```
   Storage > attachments > {your_user_id}/
   ```

### Тест безопасности:
1. Попробуйте загрузить файл > 10MB → должна быть ошибка
2. Попробуйте получить файл другого пользователя → 403 Forbidden
3. Проверьте что файлы удаляются из Storage при удалении

---

## 📈 Следующие шаги

### Ближайшие улучшения:
1. ✅ Компоненты созданы
2. 🔄 **Интегрировать в транзакции** (следующий шаг)
3. 🔄 Добавить bulk upload (несколько файлов)
4. 🔄 Добавить preview для PDF
5. 🔄 Добавить crop/resize для изображений

### Опциональные фичи:
- OCR для чеков (распознавание текста)
- AI-анализ чеков (автозаполнение суммы/категории)
- Архивация старых файлов в bucket `backups`
- Sharing файлов между пользователями

---

## 🎯 Итог

**Storage полностью готов к использованию!**

✅ Инфраструктура настроена  
✅ Компоненты созданы  
✅ Безопасность обеспечена  
✅ Документация готова  

**Осталось:** Интегрировать компоненты в UI транзакций.

---

## 📚 Полезные ссылки

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Dashboard](https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/buckets/attachments)

**Happy coding!** 🚀📎
