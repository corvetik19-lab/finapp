# 📦 Настраиваемые виджеты на дашборде

Система управления виджетами на главной странице приложения.

## 🎨 Возможности

### ✅ **Реализовано:**

1. **Видимость виджетов** - скрывать/показывать любые виджеты
2. **API для порядка** - готов endpoint для сохранения порядка
3. **Модальное окно настроек** - красивый UI для управления виджетами

### 🔧 **Виджеты:**

- 💰 **Бюджет на месяц** - контроль расходов
- 📈 **Финансовые тенденции** - график доходов/расходов
- 🥧 **Расходы по категориям** - круговая диаграмма
- 💎 **Чистые активы** - обзор активов и долгов
- 🎯 **Планы** - финансовые цели
- 📅 **Предстоящие платежи** - напоминания
- 📝 **Последние заметки** - быстрый доступ
- 📂 **Управление категориями** - редактор категорий

---

## 🚀 Использование

### **Настройка видимости:**

1. Откройте дашборд
2. Нажмите кнопку **"Настроить виджеты"** (иконка tune)
3. Переключайте видимость виджетов
4. Сохраните изменения

### **API Endpoints:**

```typescript
// Получить порядок виджетов
GET /api/dashboard/widget-order
Response: { order: DashboardWidgetKey[] }

// Сохранить порядок виджетов
POST /api/dashboard/widget-order
Body: { order: DashboardWidgetKey[] }
```

---

## 📋 Структура

```
components/dashboard/
├── WidgetSettingsModal.tsx      # Модальное окно настроек
├── DraggableWidgets.tsx         # Drag&drop компонент (готов к использованию)
└── Dashboard.module.css

lib/dashboard/preferences/
├── shared.ts                     # Типы и константы
├── service.ts                    # Серверные функции
└── client.ts                     # Клиентские функции

app/api/dashboard/
└── widget-order/
    └── route.ts                  # API для порядка виджетов
```

---

## 🎯 Будущие улучшения

### **Планируется:**

- 🎨 Drag&Drop перестановка виджетов
- 📏 Изменение размера виджетов
- 🎨 Темы оформления (тёмная/светлая)
- 🔄 Быстрые действия на виджетах
- 📊 Персональные метрики
- 💾 Экспорт/импорт конфигурации

---

## 💡 Примеры

### **Скрыть виджет программно:**

```typescript
import { toggleWidgetVisibility } from '@/lib/dashboard/preferences/client';

await toggleWidgetVisibility('net-worth');
```

### **Получить текущий порядок:**

```typescript
const response = await fetch('/api/dashboard/widget-order');
const { order } = await response.json();
console.log(order); // ['budget', 'financial-trends', ...]
```

### **Сохранить новый порядок:**

```typescript
await fetch('/api/dashboard/widget-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    order: ['plans', 'budget', 'net-worth', ...]
  }),
});
```

---

**Версия:** v1.0  
**Дата:** 2025-10-19  
**Автор:** FinApp Team
