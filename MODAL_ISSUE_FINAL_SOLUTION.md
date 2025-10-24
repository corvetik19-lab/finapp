# 🔧 ФИНАЛЬНОЕ РЕШЕНИЕ: Проблема с модальным окном просмотра файлов

## ❌ Проблема

Модальное окно просмотра файлов закрывается сразу после открытия, закрывая вместе с собой родительскую модалку редактирования транзакции.

## 🔍 Причина

**Иерархия компонентов:**
```
TransactionsGroupedList (родитель)
└── Modal "Редактирование транзакции"
    └── AttachmentsList
        └── FileViewerModal (модалка просмотра) ❌
```

Когда `AttachmentsList` вызывает `setViewingFile()`, это триггерит ре-рендер компонента, который вызывает ре-рендер родительской модалки редактирования. Родительская модалка думает что произошло изменение и **автоматически сохраняет и закрывается**.

**Даже React Portal не помогает**, потому что проблема не в DOM-иерархии, а в React state иерархии.

---

## ✅ Решение

### Вариант 1: Поднять state наверх (РЕКОМЕНДУЕТСЯ)

Переместить `viewingFile` state в `TransactionsGroupedList.tsx`:

```tsx
// TransactionsGroupedList.tsx

const [viewingFile, setViewingFile] = useState<{
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
} | null>(null);

// Передать setter вниз через props
<AttachmentsList 
  transactionId={selected.id}
  onViewFile={(file) => setViewingFile(file)}
/>

// Рендерить модалку просмотра НА ТОМ ЖЕ УРОВНЕ что и модалка редактирования
{viewingFile && (
  <FileViewerModal
    fileName={viewingFile.fileName}
    fileUrl={viewingFile.fileUrl}
    mimeType={viewingFile.mimeType}
    onClose={() => setViewingFile(null)}
  />
)}

{selected && editMode && (
  <div className={styles.modalOverlay}>
    {/* Модалка редактирования */}
  </div>
)}
```

### Изменения в AttachmentsList.tsx:

```tsx
interface AttachmentsListProps {
  transactionId: string;
  onDelete?: (attachmentId: string) => void;
  onViewFile?: (file: {
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  }) => void;
}

// В кнопке "Просмотр":
<button
  onClick={(e) => {
    e.stopPropagation();
    if (onViewFile) {
      onViewFile({
        fileName: attachment.storage_path?.split('/').pop() || 'Файл',
        fileUrl: signedUrl,
        mimeType: attachment.mime_type
      });
    }
  }}
>
  Просмотр
</button>

// Убрать весь internal state viewingFile из AttachmentsList
```

---

### Вариант 2: Использовать глобальный state (альтернатива)

Если хотите более глобальное решение, можно использовать:
- **Zustand** - легковесный state manager
- **React Context** - встроенный в React
- **Event Emitter** - кастомное решение

---

## 🎯 Преимущества Варианта 1

1. ✅ **Простота** - минимальные изменения
2. ✅ **Изоляция** - state остаётся в нужном компоненте
3. ✅ **Контроль** - родитель управляет обеими модалками
4. ✅ **Независимость** - модалки не влияют друг на друга

---

## 📋 Чек-лист имплементации

- [ ] Добавить `viewingFile` state в `TransactionsGroupedList.tsx`
- [ ] Добавить `onViewFile` prop в `AttachmentsListProps`
- [ ] Обновить кнопку "Просмотр" чтобы вызывать `onViewFile`
- [ ] Убрать internal `viewingFile` state из `AttachmentsList`
- [ ] Рендерить `<FileViewerModal>` в `TransactionsGroupedList` рядом с модалкой редактирования
- [ ] Протестировать

---

## 🔧 Альтернатива: Временное решение

Если нужно быстрое решение БЕЗ рефакторинга:

**Открывать файл в новой вкладке:**

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    window.open(signedUrl, '_blank');
  }}
>
  Просмотр
</button>
```

Это не модалка, но работает сразу без изменений архитектуры.

---

## 📚 Файлы для изменения

1. `components/transactions/TransactionsGroupedList.tsx` - добавить state
2. `components/transactions/AttachmentsList.tsx` - изменить props и убрать internal state
3. `components/transactions/FileViewerModal.tsx` - уже готов к использованию

---

**Рекомендую Вариант 1** - он чистый, простой и решает проблему полностью.

Дата: 21 октября 2025, 00:05
