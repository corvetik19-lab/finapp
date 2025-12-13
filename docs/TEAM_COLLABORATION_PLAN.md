# 📋 План разработки блока "Командная работа"

> **Дата начала:** 12.12.2024
> **Статус:** ✅ Основная реализация завершена
> **Обновлено:** 14.12.2024

---

## 🎯 Концепция

Блок "Командная работа" — модуль для организации совместной работы команды над тендерами.

- **Доступ:** только для админа организации (управление)
- **Сотрудники:** работают в рамках приглашений от админа

---

## 📁 Структура меню

Тендеры (основное меню)
├── Обзор
│   ├── Дашборд
│   ├── Тендерный отдел
│   ├── Реализация
│   └── Календарь
├── Работа
│   ├── Задачи
│   └── Реестр тендеров
└── 🆕 Командная работа (только для админа в полном режиме)
    ├── Чат
    ├── Конференции (Jitsi)
    ├── Канбан-доски
    ├── Спринты
    ├── Загрузка команды
    └── Календарь занятости

---

## ✅ Прогресс разработки

### Этап 1: Инфраструктура ✅

- [x] 1.1 Создание миграций БД (`db/migrations/20251212_team_collaboration.sql`)
  - [x] chat_rooms, chat_messages, chat_participants
  - [x] conferences, conference_participants
  - [x] kanban_boards, kanban_columns, kanban_cards, kanban_board_members
  - [x] sprints, sprint_items, sprint_retrospectives
  - [x] workload_allocations, capacity_settings
  - [x] performance_metrics, peer_reviews
  - [x] team_calendar_events, team_calendar_attendees
- [x] 1.2 Настройка RLS политик (включено в миграцию)
- [x] 1.3 Создание сервисных функций `lib/team/`
  - [x] `types.ts` - типы данных
  - [x] `kanban-service.ts` - функции для канбан-досок
  - [x] `conference-service.ts` - функции для конференций
- [x] 1.4 Добавление пункта меню "Командная работа" (`components/tenders/tenders-sidebar.tsx`)
- [x] 1.5 Создание layout для `/tenders/team/*`

### Этап 2: Канбан-доски ✅

- [x] 2.1 Страница списка досок `/tenders/team/boards`
- [x] 2.2 Создание новой доски (модальное окно)
- [x] 2.3 Детальный вид доски `/tenders/team/boards/[id]`
- [x] 2.4 Колонки с drag-and-drop (@dnd-kit)
- [x] 2.5 Карточки задач с редактированием
- [x] 2.6 Приглашение сотрудников на доску (при создании)
- [x] 2.7 API endpoints для CRUD колонок и карточек
- [x] 2.8 Связь карточек с тендерами

### Этап 3: Чат ✅

- [x] 3.1 Страница чата `/tenders/team/chat`
- [x] 3.2 Список комнат (по тендерам, командные, личные)
- [x] 3.3 Отправка сообщений
- [x] 3.4 Realtime через Supabase
- [x] 3.5 Создание новых комнат
- [x] 3.6 Вложения к сообщениям
- [x] 3.7 Индикаторы непрочитанных

### Этап 4: Спринты ✅

- [x] 4.1 Страница спринтов `/tenders/team/sprints`
- [x] 4.2 Создание спринта с датами и целью
- [x] 4.3 Управление статусом спринта
- [x] 4.4 Карточки спринтов с прогрессом
- [x] 4.5 Рейтинг по дням до завершения
- [x] 4.6 Burndown chart
- [x] 4.7 Ретроспектива

### Этап 5: Загрузка сотрудников ✅

- [x] 5.1 Страница загрузки `/tenders/team/workload`
- [x] 5.2 Карточки сотрудников с загрузкой
- [x] 5.3 Назначение задач сотрудникам
- [x] 5.4 Прогресс выполнения и статистика
- [x] 5.5 Индикаторы перегрузки/недозагрузки
- [x] 5.6 Gantt-диаграмма

### Этап 6: Видеоконференции (Jitsi) ✅

- [x] 6.1 Страница конференций `/tenders/team/conferences`
- [x] 6.2 Создание встречи (интеграция с meet.jit.si)
- [x] 6.3 Встроенный Jitsi iframe
- [x] 6.4 Приглашение участников
- [x] 6.5 История встреч
- [x] API endpoints для CRUD

### Этап 7: Календарь занятости ✅

- [x] 7.1 Страница календаря `/tenders/team/calendar`
- [x] 7.2 Календарь команды с сеткой на месяц
- [x] 7.3 Создание событий (встречи, дедлайны, отпуска, больничные)
- [x] 7.4 Просмотр деталей событий
- [x] 7.5 Типы событий с цветовой кодировкой
- [x] 7.6 Синхронизация с загрузкой и спринтами

### Этап 8: Рейтинг и аналитика ✅

- [x] 8.1 Страница аналитики `/tenders/team/analytics`
- [x] 8.2 Дашборд с общей статистикой
- [x] 8.3 Рейтинг сотрудников (leaderboard)
- [x] 8.4 Детальная таблица производительности
- [x] 8.5 Карточки топ-3 сотрудников
- [x] 8.6 Peer-review после спринтов

---

## 🗄️ Схема базы данных

### Чат

```sql
-- Комнаты чатов
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tender', 'team', 'private')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сообщения
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники комнат
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### Видеоконференции (Jitsi)

```sql
-- Конференции
CREATE TABLE conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  jitsi_room_name TEXT NOT NULL UNIQUE,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники конференций
CREATE TABLE conference_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(conference_id, user_id)
);
```

### Канбан-доски

```sql
-- Доски
CREATE TABLE kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Колонки
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6366f1',
  wip_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Карточки
CREATE TABLE kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assignee_ids UUID[] DEFAULT '{}',
  due_date DATE,
  labels TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники досок
CREATE TABLE kanban_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);
```

### Спринты

```sql
-- Спринты
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'review', 'completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Элементы спринта
CREATE TABLE sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('task', 'tender', 'card')),
  item_id UUID NOT NULL,
  story_points INTEGER,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ретроспективы
CREATE TABLE sprint_retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  what_went_well TEXT[] DEFAULT '{}',
  what_to_improve TEXT[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sprint_id)
);
```

### Загрузка сотрудников

```sql
-- Распределение загрузки
CREATE TABLE workload_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  allocated_hours INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настройки мощности
CREATE TABLE capacity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  weekly_hours INTEGER DEFAULT 40,
  vacation_days JSONB DEFAULT '[]',
  sick_days JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);
```

### Рейтинг

```sql
-- Метрики производительности
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  tenders_won INTEGER DEFAULT 0,
  tenders_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  avg_completion_days NUMERIC(5,2),
  quality_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id, period_type, period_start)
);

-- Peer-review
CREATE TABLE peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id UUID NOT NULL REFERENCES auth.users(id),
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  skills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Права доступа (RLS)

| Таблица | Админ | Сотрудник |
|---------|-------|-----------|
| chat_rooms | CRUD | R (участник) |
| chat_messages | CRUD | CR (в своих комнатах) |
| conferences | CRUD | R (приглашённый) |
| kanban_boards | CRUD | R (участник) |
| kanban_cards | CRUD | CRU (на своих досках) |
| sprints | CRUD | R |
| sprint_items | CRUD | U (свои задачи) |
| workload_allocations | CRUD | R (свои) |

---

## 📦 Зависимости

```bash
# Уже установлены
# - @dnd-kit/core, @dnd-kit/sortable (для drag-and-drop)
# - react-big-calendar или date-fns (для календаря)

# Jitsi - используем meet.jit.si (бесплатный публичный сервер)
# Интеграция через iframe + Jitsi External API
```

---

## 🔗 Полезные ссылки

- [Jitsi Meet External API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [dnd-kit](https://dndkit.com/)

---

## 📝 Заметки разработчика

### Сессия 12.12.2024

- ✅ Создана полная миграция БД с 20+ таблицами и RLS политиками
- ✅ Добавлен блок "Командная работа" в меню тендеров
- ✅ Реализованы видеоконференции через Jitsi Meet (iframe интеграция)
- ✅ Создана базовая страница канбан-досок с созданием и приглашением сотрудников
- ✅ Созданы страницы-заглушки для чата, спринтов, загрузки и календаря

**Следующие шаги:**

1. Применить миграцию к БД Supabase
2. Реализовать детальный вид канбан-доски с drag-and-drop
3. Добавить realtime чат
4. Реализовать спринты и загрузку команды

---

**Последнее обновление:** 12.12.2024
