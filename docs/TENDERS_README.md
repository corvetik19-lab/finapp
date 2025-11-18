# 🎯 Модуль управления тендерами

Полнофункциональная CRM-система для управления государственными закупками и тендерами.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Возможности](#возможности)
- [Архитектура](#архитектура)
- [API](#api)
- [Безопасность](#безопасность)
- [Документация](#документация)

---

## 🚀 Быстрый старт

### 1. Запуск миграций

```bash
# Запустить все миграции по порядку
psql -U postgres -d your_database -f db/migrations/0100_create_organizations_system.sql
psql -U postgres -d your_database -f db/migrations/0101_create_tenders_system.sql
psql -U postgres -d your_database -f db/migrations/0102_create_notifications_system.sql
psql -U postgres -d your_database -f db/migrations/0103_create_tasks_calendar_system.sql
```

### 2. Настройка Supabase Storage

```sql
-- Создать bucket для вложений
INSERT INTO storage.buckets (id, name, public)
VALUES ('tender-attachments', 'tender-attachments', false);

-- Настроить политики доступа
CREATE POLICY "Users can upload files to their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tender-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM company_members WHERE user_id = auth.uid()
  )
);
```

### 3. Создание тестовых данных

```sql
-- Создать организацию
INSERT INTO organizations (name) VALUES ('Тестовая организация');

-- Создать компанию
INSERT INTO companies (organization_id, name)
VALUES ('org-id', 'Тестовая компания');

-- Добавить пользователя в компанию
INSERT INTO company_members (company_id, user_id, role)
VALUES ('company-id', 'user-id', 'company_admin');
```

### 4. Доступ к модулю

Перейдите по адресу: `http://localhost:3000/tenders`

---

## 💎 Возможности

### Управление тендерами
- ✅ Полный CRUD (создание, чтение, обновление, удаление)
- ✅ Поиск по названию, номеру, заказчику
- ✅ Фильтрация по статусу, типу, этапу, ответственному
- ✅ Сортировка по всем полям
- ✅ Пагинация

### Kanban доски
- ✅ **Тендерный отдел** - 14 этапов от мониторинга до архива
- ✅ **Реализация** - 6 этапов постконтрактной работы
- ✅ Drag & drop между этапами
- ✅ Счетчики и суммы по этапам

### Дашборд и аналитика
- ✅ Ключевые метрики (всего, активные, выиграно, процент побед)
- ✅ Progress bars по этапам
- ✅ Топ менеджеров
- ✅ Динамика по месяцам

### Отчеты
1. **Отчет по тендерному отделу** - 6 метрик, анализ эффективности
2. **Показатели менеджеров** - рейтинг, 9 метрик на менеджера
3. **Отчет по реализации** - статус контрактов, проблемы

### Уведомления
- ✅ 9 типов уведомлений
- ✅ Настройка для каждого типа
- ✅ Push-уведомления в браузере
- ✅ Email-уведомления (готовность)
- ✅ Компонент NotificationBell

### Задачи и календарь
- ✅ Создание задач с приоритетами
- ✅ Назначение ответственных
- ✅ Чек-листы подзадач
- ✅ События календаря (9 типов)
- ✅ Напоминания

### История и комментарии
- ✅ Автоматическое логирование всех изменений
- ✅ Timeline событий
- ✅ Комментарии с упоминаниями

### Вложения
- ✅ Загрузка файлов в Supabase Storage
- ✅ Превью изображений
- ✅ Скачивание и удаление

---

## 🏗️ Архитектура

### База данных (15 таблиц)

**Организационная структура:**
- `organizations` - Организации
- `companies` - Компании
- `company_members` - Участники компаний

**Тендеры:**
- `tenders` - Основная таблица
- `tender_types` - Типы закупок
- `tender_stages` - Этапы
- `tender_history` - История изменений
- `tender_comments` - Комментарии
- `tender_attachments` - Вложения

**Уведомления:**
- `tender_notifications` - Уведомления
- `notification_settings` - Настройки
- `notification_email_log` - История email

**Задачи и календарь:**
- `tender_tasks` - Задачи
- `calendar_events` - События
- `task_reminders` - Напоминания

### Структура файлов

```
app/(protected)/tenders/
├── page.tsx                    # Список тендеров
├── new/page.tsx                # Создание
├── [id]/page.tsx               # Детальная карточка
├── [id]/edit/page.tsx          # Редактирование
├── kanban/page.tsx             # Kanban тендерного отдела
├── realization/page.tsx        # Kanban реализации
├── dashboard/page.tsx          # Дашборд
├── reports/                    # Отчеты
├── notifications/              # Уведомления
├── types/page.tsx              # Справочник типов
└── stages/page.tsx             # Справочник этапов

app/api/tenders/
├── route.ts                    # CRUD тендеров
├── [id]/route.ts               # Один тендер
├── stats/route.ts              # Статистика
├── types/route.ts              # Типы
├── stages/route.ts             # Этапы
├── history/route.ts            # История
├── comments/route.ts           # Комментарии
├── attachments/route.ts        # Вложения
├── notifications/              # Уведомления
├── tasks/route.ts              # Задачи
└── calendar/route.ts           # Календарь

components/tenders/
├── TenderForm.tsx              # Форма
├── TenderCard.tsx              # Карточка
├── TenderFilters.tsx           # Фильтры
├── TenderKanban.tsx            # Kanban
├── NotificationBell.tsx        # Колокольчик
└── ... (20+ компонентов)

lib/tenders/
├── types.ts                    # TypeScript типы
├── notification-types.ts       # Типы уведомлений
├── task-types.ts               # Типы задач
├── service.ts                  # Сервисный слой
└── utils.ts                    # Утилиты
```

---

## 🔌 API

### Тендеры

**GET /api/tenders**
```typescript
// Получить список тендеров
?company_id=uuid
&search=текст
&status=draft|active|won|lost
&stage_id=uuid
&assigned_to=uuid
&limit=50
&offset=0
```

**POST /api/tenders**
```typescript
// Создать тендер
{
  company_id: string;
  title: string;
  number: string;
  customer_name: string;
  type_id: string;
  stage_id: string;
  // ... другие поля
}
```

**GET /api/tenders/[id]**
```typescript
// Получить один тендер
```

**PATCH /api/tenders/[id]**
```typescript
// Обновить тендер
```

**DELETE /api/tenders/[id]**
```typescript
// Удалить тендер
```

### Статистика

**GET /api/tenders/stats**
```typescript
// Получить статистику
?company_id=uuid
&start_date=2024-01-01
&end_date=2024-12-31

Response: {
  overview: { totalTenders, activeTenders, wonTenders, ... }
  byStage: { [stage]: count }
  byType: { [type]: count }
  monthly: [{ month, total, won, lost, nmck }]
  topManagers: [{ user_id, name, total, won, ... }]
}
```

### Уведомления

**GET /api/tenders/notifications**
```typescript
// Получить уведомления
?unread_only=true
&limit=50
&offset=0
```

**POST /api/tenders/notifications**
```typescript
// Создать уведомление
{
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  // ...
}
```

**PATCH /api/tenders/notifications/[id]**
```typescript
// Пометить как прочитанное
```

### Задачи

**GET /api/tenders/tasks**
```typescript
// Получить задачи
?company_id=uuid
&status=pending|in_progress|completed
&assigned_to=uuid
&tender_id=uuid
```

**POST /api/tenders/tasks**
```typescript
// Создать задачу
{
  company_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: string;
  // ...
}
```

### Календарь

**GET /api/tenders/calendar**
```typescript
// Получить события
?company_id=uuid
&start_date=2024-11-01
&end_date=2024-11-30
```

**POST /api/tenders/calendar**
```typescript
// Создать событие
{
  company_id: string;
  title: string;
  event_type: 'deadline' | 'meeting' | ...;
  start_time: string;
  end_time: string;
  // ...
}
```

---

## 🔐 Безопасность

### RLS (Row Level Security)

Все таблицы защищены политиками RLS:

```sql
-- Пример политики для тендеров
CREATE POLICY "Users can view tenders in their company"
ON tenders FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);
```

### Роли пользователей

1. **Super Admin** - Полный доступ ко всему
2. **Org Admin** - Управление своей организацией
3. **Company Admin** - Управление своей компанией
4. **Manager** - Управление своими тендерами
5. **Employee** - Работа с назначенными тендерами
6. **Viewer** - Только просмотр

### Права доступа

| Действие | Super Admin | Org Admin | Company Admin | Manager | Employee | Viewer |
|----------|-------------|-----------|---------------|---------|----------|--------|
| Создать тендер | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Редактировать | ✅ | ✅ | ✅ | ✅ (свои) | ✅ (назначенные) | ❌ |
| Удалить | ✅ | ✅ | ✅ | ✅ (свои) | ❌ | ❌ |
| Просмотр | ✅ | ✅ (своей орг) | ✅ (своей компании) | ✅ | ✅ | ✅ |

---

## 📚 Документация

### Основные документы

1. **[TENDERS_IMPLEMENTATION_PLAN.md](./TENDERS_IMPLEMENTATION_PLAN.md)** - План разработки с прогрессом
2. **[TENDERS_MODULE_COMPLETE.md](./TENDERS_MODULE_COMPLETE.md)** - Детальный отчет о завершении
3. **[TENDERS_SUMMARY.md](./TENDERS_SUMMARY.md)** - Краткое резюме проекта
4. **[TENDERS_USER_GUIDE.md](./TENDERS_USER_GUIDE.md)** - Руководство пользователя
5. **[TENDERS_FINAL_REPORT.md](./TENDERS_FINAL_REPORT.md)** - Финальный отчет
6. **[TENDERS_README.md](./TENDERS_README.md)** - Этот документ

### Миграции БД

- `db/migrations/0100_create_organizations_system.sql` - Организации
- `db/migrations/0101_create_tenders_system.sql` - Тендеры
- `db/migrations/0102_create_notifications_system.sql` - Уведомления
- `db/migrations/0103_create_tasks_calendar_system.sql` - Задачи и календарь

---

## 🎯 Использование

### Создание тендера

```typescript
// 1. Перейти на /tenders/new
// 2. Заполнить форму
// 3. Нажать "Создать тендер"

// Или через API:
const response = await fetch('/api/tenders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company_id: 'uuid',
    title: 'Поставка оборудования',
    number: '№ 0373100012324000001',
    customer_name: 'ГБУЗ "Больница №1"',
    type_id: 'type-uuid',
    stage_id: 'stage-uuid',
    nmck: 150000000, // в копейках
    // ...
  }),
});
```

### Работа с Kanban

```typescript
// Перетащить карточку на другой этап
// Система автоматически:
// 1. Обновит stage_id тендера
// 2. Создаст запись в tender_history
// 3. Отправит уведомление ответственному
```

### Создание уведомления

```typescript
const notification = await fetch('/api/tenders/notifications', {
  method: 'POST',
  body: JSON.stringify({
    company_id: 'uuid',
    user_id: 'uuid',
    tender_id: 'uuid',
    type: 'deadline_approaching',
    title: 'Приближается срок подачи',
    message: 'До дедлайна осталось 3 дня',
    link: '/tenders/tender-id',
    priority: 'high',
  }),
});
```

### Создание задачи

```typescript
const task = await fetch('/api/tenders/tasks', {
  method: 'POST',
  body: JSON.stringify({
    company_id: 'uuid',
    tender_id: 'uuid',
    title: 'Подготовить документы',
    description: 'Собрать все необходимые документы для подачи',
    priority: 'high',
    due_date: '2024-11-15T12:00:00Z',
    assigned_to: 'user-uuid',
    checklist: [
      { id: '1', text: 'Устав', completed: false },
      { id: '2', text: 'ИНН', completed: true },
    ],
  }),
});
```

---

## 🚀 Развертывание

### Vercel

```bash
# 1. Установить Vercel CLI
npm i -g vercel

# 2. Деплой
vercel --prod

# 3. Настроить переменные окружения в Vercel Dashboard
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 📊 Метрики

- **Файлов:** 85+
- **Строк кода:** 20000+
- **Компонентов:** 20+
- **API эндпоинтов:** 40+
- **Таблиц БД:** 15
- **RLS политик:** 50+
- **Страниц:** 35+

---

## 🤝 Поддержка

При возникновении вопросов:

1. Проверьте [документацию](./TENDERS_USER_GUIDE.md)
2. Посмотрите [примеры использования](#использование)
3. Проверьте логи в консоли браузера
4. Проверьте логи Supabase

---

## 📝 Лицензия

Proprietary - Все права защищены

---

**Версия:** 1.0.0  
**Дата:** 11 ноября 2025  
**Статус:** ✅ Production Ready
