# Офлайн-очередь операций

## 📚 Что это?

Система, которая позволяет работать с приложением **БЕЗ интернета**:
- Добавлять транзакции
- Редактировать данные
- Удалять записи

Все операции сохраняются локально и **автоматически синхронизируются** когда интернет появится.

## 🎯 Как это работает?

### 1. БЕЗ интернета:

```
Пользователь → Добавить транзакцию 500₽
              ↓
    Сохранить в IndexedDB (локально)
              ↓
    Показать в UI с меткой "🔄 Ожидает синхронизации"
```

### 2. ПОЯВИЛСЯ интернет:

```
Service Worker обнаруживает подключение
              ↓
    Автоматически синхронизирует все операции
              ↓
    Удаляет из локальной очереди
              ↓
    ✅ Данные в облаке обновлены
```

## 💻 Компоненты системы

### 1. OfflineQueue (`lib/offline/queue.ts`)

**Управление локальной очередью операций**

```typescript
import { offlineQueue } from "@/lib/offline/queue";

// Добавить операцию в очередь
await offlineQueue.add({
  type: "create",
  entity: "transactions",
  data: {
    amount: 50000, // 500₽ в копейках
    direction: "expense",
    category_id: "uuid",
    // ...
  },
});

// Получить все операции
const operations = await offlineQueue.getAll();

// Удалить операцию
await offlineQueue.remove("operation-id");

// Количество операций
const count = await offlineQueue.count();
```

### 2. SyncService (`lib/offline/sync.ts`)

**Автоматическая синхронизация**

```typescript
import { syncService } from "@/lib/offline/sync";

// Начать автосинхронизацию
syncService.startAutoSync();

// Синхронизировать вручную
const result = await syncService.sync();
console.log(`Успешно: ${result.success}, Ошибки: ${result.failed}`);

// Получить статус
const status = await syncService.getStatus();
console.log(status);
// {
//   isOnline: true,
//   isSyncing: false,
//   pendingCount: 3
// }
```

### 3. OfflineIndicator (`components/offline/OfflineIndicator.tsx`)

**Визуальный индикатор статуса**

Показывает пользователю:
- 📴 **Офлайн режим** - нет интернета
- 🔄 **Синхронизация...** - идёт отправка данных
- ⏳ **Ожидает синхронизации: 3** - операции в очереди

Автоматически появляется в правом верхнем углу.

## 🔧 Как использовать в коде?

### Пример: Добавление транзакции с поддержкой офлайн

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { offlineQueue } from "@/lib/offline/queue";

export function CreateTransactionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: TransactionData) {
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Проверить подключение
      if (!navigator.onLine) {
        // ОФЛАЙН: добавить в очередь
        await offlineQueue.add({
          type: "create",
          entity: "transactions",
          data,
        });

        alert("✅ Транзакция сохранена. Будет синхронизирована позже.");
        return;
      }

      // ОНЛАЙН: сразу сохранить
      const { error } = await supabase.from("transactions").insert(data);

      if (error) throw error;

      alert("✅ Транзакция создана!");
    } catch (error) {
      console.error("Error:", error);

      // Если ошибка сети - добавить в очередь
      if ((error as Error).message.includes("network")) {
        await offlineQueue.add({
          type: "create",
          entity: "transactions",
          data,
        });
        alert("⚠️ Проблема с сетью. Транзакция будет синхронизирована позже.");
      } else {
        alert("❌ Ошибка: " + (error as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ...
}
```

## 📊 Структура операции

```typescript
interface PendingOperation {
  id: string; // UUID
  type: "create" | "update" | "delete";
  entity: "transactions" | "budgets" | "categories" | "plans";
  data: unknown; // Данные операции
  timestamp: number; // Когда создана
  attempts: number; // Количество попыток синхронизации
  lastError?: string; // Последняя ошибка
}
```

## 🔄 Логика синхронизации

### 1. Автоматические триггеры:

- ✅ При появлении интернета (`window.addEventListener("online")`)
- ✅ Каждые 30 секунд (если онлайн)
- ✅ При открытии приложения

### 2. Порядок синхронизации:

1. Получить все операции из очереди
2. Выполнить их по очереди (FIFO - первым пришёл, первым вышел)
3. Успешные - удалить из очереди
4. Неудачные - увеличить счётчик попыток
5. После 5 неудачных попыток - удалить операцию

### 3. Обработка ошибок:

```typescript
// Если ошибка сети - повторить позже
if (error.message.includes("network")) {
  // Увеличить attempts, оставить в очереди
}

// Если ошибка валидации - удалить из очереди
if (error.message.includes("validation")) {
  // Операция невалидна, больше не пытаться
  await offlineQueue.remove(operation.id);
}
```

## 🎨 Настройка внешнего вида

### Изменить положение индикатора:

```css
/* OfflineIndicator.module.css */
.container {
  position: fixed;
  top: 70px; /* Изменить на нужную позицию */
  right: 20px; /* Или left: 20px */
  z-index: 9999;
}
```

### Изменить цвета:

```css
.offline {
  background: #your-color;
  color: #your-text-color;
}
```

## 🧪 Тестирование

### Симуляция офлайн режима:

**1. В Chrome DevTools:**
- F12 → Network tab
- Выбрать "Offline" в выпадающем списке

**2. В коде:**
```javascript
// Эмуляция офлайн
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: false,
});

// Триггер события
window.dispatchEvent(new Event("offline"));
```

### Проверка очереди:

```typescript
import { offlineQueue } from "@/lib/offline/queue";

// Посмотреть что в очереди
const operations = await offlineQueue.getAll();
console.log("Pending operations:", operations);

// Очистить очередь (для тестирования)
await offlineQueue.clear();
```

## ⚠️ Ограничения

### Что НЕ работает офлайн:

- ❌ **AI функции** (требуется OpenAI API)
- ❌ **Загрузка изображений** (Supabase Storage)
- ❌ **Получение новых данных** от других пользователей
- ❌ **Авторизация** (magic link требует интернет)

### Что РАБОТАЕТ офлайн:

- ✅ **Просмотр** ранее загруженных данных
- ✅ **Создание** новых записей (в очередь)
- ✅ **Редактирование** существующих (в очередь)
- ✅ **Удаление** записей (в очередь)

## 📱 Хранилище IndexedDB

Данные хранятся локально в браузере:

```
База данных: finapp_offline
Object Store: pending_operations

Индексы:
- timestamp (для сортировки по времени)
- entity (для фильтрации по типу)
```

### Просмотр данных в DevTools:

1. F12 → Application tab
2. Storage → IndexedDB → finapp_offline
3. pending_operations

## 🚀 Дальнейшие улучшения

### Этап 2 (не реализовано):

- [ ] **Conflict resolution** - разрешение конфликтов
- [ ] **Delta sync** - синхронизация только изменений
- [ ] **Background sync** - работа в фоне (Service Worker API)
- [ ] **Оптимистичные обновления** - показывать изменения до синхронизации
- [ ] **Batch operations** - группировка операций для эффективности

## 📚 Документация API

### offlineQueue

```typescript
class OfflineQueue {
  // Инициализация (вызывается автоматически)
  async init(): Promise<void>;

  // Добавить операцию
  async add(operation: Omit<PendingOperation, "id" | "timestamp" | "attempts">): Promise<string>;

  // Получить все операции
  async getAll(): Promise<PendingOperation[]>;

  // Удалить операцию
  async remove(id: string): Promise<void>;

  // Обновить операцию
  async update(id: string, updates: Partial<PendingOperation>): Promise<void>;

  // Очистить очередь
  async clear(): Promise<void>;

  // Количество операций
  async count(): Promise<number>;
}
```

### syncService

```typescript
class SyncService {
  // Начать автосинхронизацию
  startAutoSync(intervalMs?: number): void;

  // Остановить автосинхронизацию
  stopAutoSync(): void;

  // Синхронизировать сейчас
  async sync(): Promise<{ success: number; failed: number }>;

  // Получить статус
  async getStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
  }>;
}
```

## 🎯 Примеры использования

### Показать количество операций в очереди:

```typescript
"use client";

import { useState, useEffect } from "react";
import { offlineQueue } from "@/lib/offline/queue";

export function PendingOperationsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const c = await offlineQueue.count();
      setCount(c);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div>
      {count} операций ожидает синхронизации
    </div>
  );
}
```

### Ручная синхронизация:

```typescript
"use client";

import { syncService } from "@/lib/offline/sync";

export function ManualSyncButton() {
  async function handleSync() {
    const result = await syncService.sync();
    alert(`Синхронизировано: ${result.success}, Ошибок: ${result.failed}`);
  }

  return <button onClick={handleSync}>Синхронизировать сейчас</button>;
}
```

---

**Статус:** ✅ Базовая реализация готова  
**Версия:** 1.0  
**Дата:** 2025-10-11
