# 🎓 Onboarding - Руководство для новых пользователей

Интерактивная система знакомства с приложением FinApp.

## 📋 Компоненты Onboarding

### 1. Интерактивный тур (TourGuide)

Пошаговая экскурсия по интерфейсу с подсказками.

**Технология:** react-joyride

**Страницы с турами:**
- `/dashboard` - знакомство с дашбордом
- `/transactions` - работа с транзакциями
- `/budgets` - управление бюджетами
- `/reports` - аналитика и отчёты
- `/ai-chat` - AI функции

**Функции:**
- Автоматический запуск для новых пользователей
- Можно пропустить или завершить досрочно
- Сохранение прогресса в localStorage
- Адаптивные стили и русский язык

### 2. Чек-лист "Первые шаги" (OnboardingChecklist)

Красочный чек-лист с прогрессом выполнения базовых действий.

**Отображается на дашборде** до завершения всех пунктов.

**Пункты чек-листа:**

1. 🗺️ Пройти тур по приложению
2. 💳 Создать первый счёт
3. 💸 Добавить первую транзакцию
4. 📂 Создать категорию
5. 🎯 Установить бюджет
6. 🤖 Попробовать AI чат

**Функции:**
- Автоматическая проверка прогресса каждые 2 секунды
- Клик по пункту ведёт на нужную страницу
- Прогресс-бар с процентами
- Анимация "Поздравляем!" при завершении
- Можно свернуть или скрыть

---

## 🏗 Архитектура

### Файлы:

```
components/onboarding/
├── TourGuide.tsx                   # Интерактивный тур
├── OnboardingChecklist.tsx         # Чек-лист первых шагов
└── OnboardingChecklist.module.css  # Стили чек-листа

app/api/onboarding/
└── progress/
    └── route.ts                    # API для проверки прогресса
```

### API Endpoint:

```typescript
GET /api/onboarding/progress
```

**Возвращает:**
```json
{
  "accounts": 2,
  "transactions": 15,
  "categories": 8,
  "budgets": 3,
  "ai_messages": 5
}
```

### LocalStorage ключи:

- `tour_{page}_completed` - завершён ли тур на странице
- `show_tours` - показывать ли туры (false = отключить все)
- `onboarding_checklist` - прогресс чек-листа
- `onboarding_checklist_hidden` - скрыт ли чек-лист

---

## 🎯 Использование

### Добавить тур на страницу:

```tsx
import TourGuide from '@/components/onboarding/TourGuide';

export default function MyPage() {
  return (
    <div>
      <TourGuide page="my-page" />
      {/* Остальной контент */}
    </div>
  );
}
```

### Добавить data-tour атрибуты:

```tsx
<div data-tour="my-element">
  Этот элемент будет использован в туре
</div>
```

### Добавить чек-лист:

```tsx
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';

export default function Dashboard() {
  return (
    <div>
      <OnboardingChecklist />
      {/* Остальной контент */}
    </div>
  );
}
```

---

## 🎨 Кастомизация

### Изменить шаги тура:

Отредактируйте массив `steps` в `TourGuide.tsx`:

```typescript
const myPageSteps: Step[] = [
  {
    target: '[data-tour="element-1"]',
    content: (
      <div>
        <h3>Заголовок</h3>
        <p>Описание элемента</p>
      </div>
    ),
    placement: 'bottom',
  },
  // ... другие шаги
];
```

### Изменить пункты чек-листа:

Отредактируйте массив `checklistItems` в `OnboardingChecklist.tsx`:

```typescript
{
  id: 'my_task',
  title: 'Название задачи',
  description: 'Описание',
  icon: '🎯',
  link: '/path/to/page',
  completed: progress.my_metric > 0,
}
```

### Стили чек-листа:

Цвета градиента в `OnboardingChecklist.module.css`:

```css
.container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

---

## 🚀 Сценарии использования

### Новый пользователь впервые открывает приложение:

1. Загружается `/dashboard`
2. Автоматически запускается интерактивный тур
3. Показывается чек-лист "Первые шаги"
4. Пользователь проходит тур (или пропускает)
5. Выполняет пункты чек-листа один за другим
6. При завершении видит "Поздравляем!" 🎉

### Опытный пользователь:

1. Все туры уже пройдены (`tour_*_completed = true`)
2. Чек-лист скрыт (`onboarding_checklist_hidden = true`)
3. Ничего не мешает работе
4. Можно сбросить через DevTools или localStorage.clear()

---

## 🧪 Тестирование

### Сброс onboarding для тестирования:

```javascript
// В консоли браузера
localStorage.removeItem('tour_dashboard_completed');
localStorage.removeItem('tour_transactions_completed');
localStorage.removeItem('tour_budgets_completed');
localStorage.removeItem('tour_reports_completed');
localStorage.removeItem('tour_ai-chat_completed');
localStorage.removeItem('onboarding_checklist');
localStorage.removeItem('onboarding_checklist_hidden');
localStorage.removeItem('show_tours');

// Перезагрузить страницу
location.reload();
```

### Отключить все туры:

```javascript
localStorage.setItem('show_tours', 'false');
```

### Включить туры обратно:

```javascript
localStorage.removeItem('show_tours');
```

---

## 📊 Метрики и аналитика

### Отслеживаемые события:

- Запуск тура (`tour_started`)
- Завершение тура (`tour_completed`)
- Пропуск тура (`tour_skipped`)
- Выполнение пункта чек-листа
- Скрытие чек-листа

### Интеграция с аналитикой:

Добавьте в `TourGuide.tsx`:

```typescript
// В handleJoyrideCallback
if (status === STATUS.FINISHED) {
  // Отправить событие
  analytics.track('tour_completed', { page });
}
```

---

## 🎓 Best Practices

### ✅ Делайте:

- Короткие и ёмкие описания
- Логичная последовательность шагов
- Возможность пропустить тур
- Адаптивный дизайн для мобильных

### ❌ Не делайте:

- Слишком длинные туры (>10 шагов)
- Туры которые нельзя пропустить
- Туры на каждом клике
- Сложный технический язык

---

## 🔧 Troubleshooting

### Тур не запускается:

1. Проверьте `localStorage` - возможно тур уже пройден
2. Убедитесь что `data-tour` атрибуты присутствуют
3. Проверьте что элементы видимы на странице
4. Задержка 1 секунда - возможно элементы ещё не загрузились

### Чек-лист не обновляется:

1. Проверьте API `/api/onboarding/progress`
2. Убедитесь что пользователь авторизован
3. Проверьте права доступа к таблицам (RLS)

### Элемент не подсвечивается в туре:

1. Проверьте селектор в `target`
2. Убедитесь что элемент видим (не `display: none`)
3. Попробуйте другой `placement` ('top', 'bottom', 'left', 'right')

---

## 📦 Зависимости

```json
{
  "react-joyride": "^2.8.0"
}
```

---

## 🚀 Будущие улучшения

Планируется добавить:

- 🎥 Видео-туториалы для сложных функций
- 📝 Контекстные подсказки (tooltips)
- 🎮 Геймификация прогресса
- 📊 A/B тестирование разных туров
- 🌐 Мультиязычность

---

**Версия:** v1.0  
**Дата:** 2025-10-19  
**Автор:** FinApp Team
