# ✅ PRIVATE BUCKET FIX

## 🔧 Проблема

```json
{
  "statusCode": "404",
  "error": "Bucket not found",
  "message": "Bucket not found"
}
```

**Причина:** Bucket `attachments` настроен как **private** (приватный). Публичные URL не работают для приватных buckets.

---

## ✅ Решение

Используем **Signed URLs** (временные подписанные ссылки) вместо публичных.

---

## 📝 Что изменилось

### AttachmentsList.tsx:

#### 1. Новый state для signed URLs:
```tsx
const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
```

#### 2. Функция создания signed URL:
```tsx
const getSignedUrl = async (filePath: string | null): Promise<string> => {
  if (!filePath) return '';
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  if (error) return '';
  return data.signedUrl;
};
```

#### 3. Генерация URLs при загрузке:
```tsx
const fetchAttachments = async () => {
  // ... загрузка attachments

  // Генерируем signed URLs для всех файлов
  const urls: Record<string, string> = {};
  for (const attachment of data || []) {
    if (attachment.storage_path) {
      const url = await getSignedUrl(attachment.storage_path);
      urls[attachment.id] = url;
    }
  }
  setSignedUrls(urls);
};
```

#### 4. Использование signed URL в UI:
```tsx
const signedUrl = signedUrls[attachment.id] || '';

// Для preview изображений:
<img src={signedUrl} alt={fileName} />

// Для кнопки "Открыть":
<a href={signedUrl} target="_blank">Открыть</a>
```

---

## 🔐 Signed URLs vs Public URLs

### Public URLs (не работают для private buckets):
```tsx
// ❌ НЕ работает для private bucket
const { data } = supabase.storage
  .from('attachments')
  .getPublicUrl(filePath);
```

### Signed URLs (работают для private buckets):
```tsx
// ✅ Работает для private bucket
const { data } = await supabase.storage
  .from('attachments')
  .createSignedUrl(filePath, 3600); // expires in 1 hour
```

---

## ⏱️ Время жизни ссылок

**3600 секунд = 1 час**

После истечения ссылка становится недействительной. Это нормально для безопасности.

### Преимущества:
✅ **Безопасность** - ссылка работает ограниченное время  
✅ **Контроль доступа** - только авторизованные пользователи  
✅ **RLS защита** - проверка прав через Supabase  

### Обновление ссылок:
Ссылки автоматически генерируются заново при каждом открытии модального окна с вложениями.

---

## 🚀 Альтернатива: сделать bucket публичным

Если хотите использовать публичные URL:

### Dashboard:
```
https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/buckets
```

1. Выберите bucket `attachments`
2. Settings → Make bucket public

### ⚠️ Внимание:
Это **менее безопасно**, так как любой со ссылкой сможет получить доступ к файлу (даже без авторизации).

**Рекомендуем оставить private** и использовать signed URLs.

---

## ✅ Готово!

**Просмотр и скачивание файлов теперь работает через signed URLs.**

---

**Дата:** 20 октября 2025, 23:05  
**Статус:** ✅ Private bucket fixed
