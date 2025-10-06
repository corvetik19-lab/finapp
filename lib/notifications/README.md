# Система уведомлений Finapp

Единая система уведомлений для всего приложения с колокольчиком в топ-баре.

## Использование

### 1. В клиентских компонентах

```tsx
"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { notifySuccess, notifyError } from "@/lib/notifications/helpers";

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleSave = async () => {
    try {
      // ... ваш код сохранения
      
      addNotification(notifySuccess({
        title: "Сохранено",
        message: "Данные успешно сохранены",
        actionUrl: "/dashboard",
        actionLabel: "Перейти на дашборд",
      }));
    } catch (error) {
      addNotification(notifyError({
        title: "Ошибка",
        message: "Не удалось сохранить данные",
      }));
    }
  };

  return <button onClick={handleSave}>Сохранить</button>;
}
```

### 2. Использование готовых уведомлений

```tsx
import { useNotifications } from "@/contexts/NotificationContext";
import { CommonNotifications } from "@/lib/notifications/helpers";

function TransactionForm() {
  const { addNotification } = useNotifications();

  const handleSubmit = async () => {
    // ... создание транзакции
    
    addNotification(CommonNotifications.transactionCreated("1 500 ₽"));
  };
}
```

### 3. Предупреждение о бюджете

```tsx
addNotification(CommonNotifications.budgetExceeded("Продукты", 105));
```

### 4. Напоминание о платеже

```tsx
addNotification(CommonNotifications.paymentDue("Коммунальные услуги", 3));
```

## Типы уведомлений

- **success** - успешные операции (зеленый)
- **error** - ошибки (красный)
- **warning** - предупреждения (оранжевый)
- **info** - информация (синий)

## Приоритеты

- **low** - низкий (обычная информация)
- **normal** - нормальный (стандартные действия)
- **high** - высокий (ошибки, важные события)

## Создание кастомного уведомления

```tsx
import type { NotificationInput } from "@/lib/notifications/types";

const customNotification: NotificationInput = {
  type: "warning",
  priority: "high",
  title: "Внимание!",
  message: "Необходимо обновить данные",
  actionUrl: "/settings",
  actionLabel: "Перейти в настройки",
  icon: "settings",
};

addNotification(customNotification);
```

## Функции управления

```tsx
const {
  notifications,        // Все уведомления
  addNotification,     // Добавить уведомление
  removeNotification,  // Удалить уведомление
  markAsRead,          // Отметить как прочитанное
  markAllAsRead,       // Отметить все как прочитанные
  clearAll,            // Очистить все
  unreadCount,         // Количество непрочитанных
} = useNotifications();
```

## Хранение

Уведомления автоматически сохраняются в `localStorage` и восстанавливаются при перезагрузке страницы. Максимум 50 уведомлений.

## Material Icons

Можно использовать любые иконки из Material Icons:
- check_circle
- error
- warning
- info
- celebration
- receipt
- pie_chart
- flag
- account_balance_wallet
- и другие...

## Примеры использования в разных частях приложения

### Транзакции
- Создание: `CommonNotifications.transactionCreated("1 500 ₽")`
- Обновление: `CommonNotifications.transactionUpdated()`
- Удаление: `CommonNotifications.transactionDeleted()`

### Бюджеты
- Превышение: `CommonNotifications.budgetExceeded("Продукты", 105)`
- Создание: `CommonNotifications.budgetCreated()`

### Платежи
- Напоминание: `CommonNotifications.paymentDue("Коммунальные", 3)`
- Просрочка: `CommonNotifications.paymentOverdue("Интернет")`

### Планы
- Достижение цели: `CommonNotifications.planGoalReached("Отпуск")`
- Прогресс: `CommonNotifications.planProgress("Машина", 75)`

### Долги
- Создание: `CommonNotifications.debtCreated()`
- Оплата: `CommonNotifications.debtPaid("Иван")`
- Просрочка: `CommonNotifications.debtOverdue("Петр")`
