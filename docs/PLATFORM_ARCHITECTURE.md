# 🏗️ Архитектура мультимодальной платформы

## Обзор

Платформа представляет собой мультимодальное приложение с динамическим переключением режимов работы:
- **Финансы** (существующий, полнофункциональный)
- **Инвестиции** (заглушка, будущий функционал)
- **Личные** (заглушка, будущий функционал)
- **Учёт тендеров** (заглушка, будущий функционал)

## Принципы архитектуры

### 1. Модульность
- Каждый режим — изолированный модуль
- Общие компоненты вынесены в shared
- Feature flags для постепенного включения функционала

### 2. Multi-tenancy
- Строгая изоляция данных на уровне `org_id`
- Row Level Security (RLS) для всех таблиц
- Организация как основная единица изоляции

### 3. Единообразие UI
- Постоянная верхняя панель (header)
- Динамическая левая панель (sidebar) по режиму
- Общие настройки для всех режимов

### 4. Расширяемость
- Mode Registry для регистрации новых режимов
- Plugin-based архитектура для интеграций
- API-first подход

## Структура каталогов

```
app/
├── (platform)/                    # Платформенная обертка
│   ├── layout.tsx                # Основной layout с header
│   ├── PlatformShell.tsx         # Shell с mode switcher
│   ├── mode-registry.ts          # Реестр режимов
│   │
│   ├── finance/                  # Режим: Финансы
│   │   ├── layout.tsx            # Layout режима
│   │   ├── sidebar.tsx           # Левое меню
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   └── ...                   # Существующий функционал
│   │
│   ├── investments/              # Режим: Инвестиции (заглушка)
│   │   ├── layout.tsx
│   │   ├── sidebar.tsx
│   │   └── placeholder/
│   │
│   ├── personal/                 # Режим: Личные (заглушка)
│   │   ├── layout.tsx
│   │   ├── sidebar.tsx
│   │   └── placeholder/
│   │
│   ├── tenders/                  # Режим: Тендеры (заглушка)
│   │   ├── layout.tsx
│   │   ├── sidebar.tsx
│   │   └── placeholder/
│   │
│   └── settings/                 # Общие настройки
│       ├── organization/
│       ├── users/
│       ├── roles/
│       ├── integrations/
│       ├── categories/
│       └── billing/
│
components/
├── platform/                     # Платформенные компоненты
│   ├── Header.tsx               # Верхняя панель
│   ├── ModeSwitcher.tsx         # Переключатель режимов
│   ├── OrgSwitcher.tsx          # Переключатель организаций
│   ├── NotificationCenter.tsx   # Центр уведомлений
│   └── UserMenu.tsx             # Меню пользователя
│
├── shared/                       # Общие компоненты
│   ├── navigation/
│   ├── forms/
│   └── data-display/
│
└── modes/                        # Компоненты режимов
    ├── finance/
    ├── investments/
    ├── personal/
    └── tenders/

lib/
├── platform/
│   ├── modes.ts                 # Mode Registry API
│   ├── permissions.ts           # Система прав
│   └── multi-tenant.ts          # Multi-tenancy helpers
│
└── integrations/                # Интеграции
    ├── telegram/
    ├── n8n/
    └── registry.ts

db/
├── migrations/
│   ├── 001_add_orgs.sql         # Организации
│   ├── 002_add_modes.sql        # Режимы и настройки
│   └── 003_migrate_finance.sql  # Миграция финансов
│
└── rls/                          # RLS политики
    ├── organizations.sql
    ├── users.sql
    └── mode_data.sql
```

## Схема базы данных

### Новые таблицы

```sql
-- Организации (multi-tenancy)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Члены организации
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Настройки режимов для организаций
CREATE TABLE organization_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  mode_key TEXT NOT NULL, -- 'finance', 'investments', etc.
  is_enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, mode_key)
);

-- Интеграции организации
CREATE TABLE organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'telegram', 'n8n', etc.
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  credentials JSONB DEFAULT '{}', -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, integration_type)
);
```

### Миграция существующих таблиц

Все существующие таблицы получают поле `org_id`:

```sql
-- Добавляем org_id к существующим таблицам
ALTER TABLE transactions ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE accounts ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE categories ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE budgets ADD COLUMN org_id UUID REFERENCES organizations(id);
-- ... и т.д. для всех таблиц

-- Миграция данных: создаём дефолтную организацию для каждого пользователя
INSERT INTO organizations (name, slug, owner_id)
SELECT 
  'Личная организация ' || id,
  'org-' || id,
  id
FROM auth.users;

-- Связываем существующие данные с организациями
UPDATE transactions t
SET org_id = (
  SELECT id FROM organizations WHERE owner_id = t.user_id LIMIT 1
);
```

## Mode Registry

Централизованный реестр режимов:

```typescript
// lib/platform/mode-registry.ts
export interface ModeConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isEnabled: boolean;
  permissions: {
    view: string[];
    edit: string[];
    admin: string[];
  };
  routes: {
    root: string;
    dashboard: string;
  };
  features: {
    ai: boolean;
    analytics: boolean;
    exports: boolean;
    integrations: boolean;
  };
}

export const MODE_REGISTRY: Record<string, ModeConfig> = {
  finance: {
    key: 'finance',
    name: 'Финансы',
    icon: 'account_balance_wallet',
    color: '#10B981',
    description: 'Учёт доходов, расходов и бюджетов',
    isEnabled: true,
    permissions: {
      view: ['member', 'admin', 'owner'],
      edit: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/finance',
      dashboard: '/finance/dashboard',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: true,
    },
  },
  investments: {
    key: 'investments',
    name: 'Инвестиции',
    icon: 'trending_up',
    color: '#3B82F6',
    description: 'Управление портфелем и инвестициями',
    isEnabled: false, // Feature flag
    permissions: {
      view: ['member', 'admin', 'owner'],
      edit: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/investments',
      dashboard: '/investments/dashboard',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: false,
    },
  },
  personal: {
    key: 'personal',
    name: 'Личные',
    icon: 'person',
    color: '#8B5CF6',
    description: 'Личный органайзер и заметки',
    isEnabled: false,
    permissions: {
      view: ['member', 'admin', 'owner'],
      edit: ['member', 'admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/personal',
      dashboard: '/personal/dashboard',
    },
    features: {
      ai: true,
      analytics: false,
      exports: true,
      integrations: false,
    },
  },
  tenders: {
    key: 'tenders',
    name: 'Тендеры',
    icon: 'description',
    color: '#F59E0B',
    description: 'Учёт и управление тендерами',
    isEnabled: false,
    permissions: {
      view: ['member', 'admin', 'owner'],
      edit: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/tenders',
      dashboard: '/tenders/dashboard',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: true,
    },
  },
};
```

## Система прав и ролей

```typescript
// lib/platform/permissions.ts
export enum Role {
  OWNER = 'owner',     // Владелец организации
  ADMIN = 'admin',     // Администратор
  MEMBER = 'member',   // Участник
  VIEWER = 'viewer',   // Только просмотр
}

export interface Permission {
  mode: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'admin';
  resource?: string;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    { mode: '*', action: 'admin' },
  ],
  [Role.ADMIN]: [
    { mode: '*', action: 'edit' },
    { mode: '*', action: 'create' },
    { mode: '*', action: 'delete' },
  ],
  [Role.MEMBER]: [
    { mode: '*', action: 'view' },
    { mode: '*', action: 'create' },
    { mode: '*', action: 'edit' },
  ],
  [Role.VIEWER]: [
    { mode: '*', action: 'view' },
  ],
};
```

## Этапы миграции

### Фаза 1: Подготовка (неделя 1)
- [x] Создание схемы БД для multi-tenancy
- [x] Миграция существующих данных
- [x] Настройка RLS политик (упрощённые)
- [x] Тестирование изоляции данных

### Фаза 2: Платформенная обертка (неделя 2)
- [x] Создание PlatformShell с Header
- [x] Реализация ModeSwitcher
- [x] Настройка Mode Registry
- [x] Миграция существующих маршрутов в /finance

### Фаза 3: Общие настройки (неделя 3)
- [x] Разделение настроек на глобальные (/admin/settings) и режимные (/finance/settings)
- [x] Управление организацией
- [x] Управление пользователями и ролями
- [x] Настройки режима Финансы (22 параметра + категории + планы)
- [x] Интеграции (Telegram, n8n, Slack, Email)

### Фаза 4: Заглушки новых режимов (неделя 4)
- [x] Инвестиции - каркас
- [x] Личные - каркас
- [x] Тендеры - каркас
- [x] Placeholder компоненты

### Фаза 5: Тестирование и оптимизация
- [x] E2E тесты переключения режимов (через Playwright)
- [x] Проверка RLS и изоляции
- [ ] Оптимизация производительности
- [x] Документация

## API совместимость

### Backward Compatibility

Существующие API endpoints сохраняются:
```
/api/transactions -> /api/finance/transactions (redirect)
/api/budgets -> /api/finance/budgets (redirect)
/api/categories -> /api/finance/categories (redirect)
```

### Новая структура API

```
/api/v2/
├── org/                          # Управление организацией
│   ├── [orgId]/
│   │   ├── members/
│   │   ├── settings/
│   │   └── integrations/
│
├── finance/                      # Режим Финансы
│   ├── transactions/
│   ├── budgets/
│   └── analytics/
│
├── investments/                  # Режим Инвестиции
├── personal/                     # Режим Личные
└── tenders/                      # Режим Тендеры
```

## Интеграции

### Telegram
- Уведомления о транзакциях
- Команды для быстрого добавления
- Отчёты по запросу

### n8n
- Автоматизация импорта из банков
- Webhook для событий
- Кастомные workflow

### Расширяемость
```typescript
// lib/integrations/registry.ts
export interface Integration {
  type: string;
  name: string;
  icon: string;
  configSchema: z.ZodSchema;
  setup: (config: any) => Promise<void>;
  teardown: () => Promise<void>;
}

export const INTEGRATIONS: Record<string, Integration> = {
  telegram: { /* ... */ },
  n8n: { /* ... */ },
  // Легко добавлять новые
};
```

## AI во всех режимах

Каждый режим имеет AI-функционал:

### Финансы
- AI Советник
- AI Аналитика
- Умная категоризация

### Инвестиции (будущее)
- Анализ портфеля
- Рекомендации по ребалансировке
- Прогнозы доходности

### Личные (будущее)
- Умные напоминания
- Категоризация заметок
- Автоматические резюме

### Тендеры (будущее)
- Анализ тендерной документации
- Генерация коммерческих предложений
- Оценка вероятности победы

## Мониторинг и метрики

- Использование режимов по организациям
- Популярность функций
- Производительность переключения
- Ошибки изоляции данных

## Безопасность

1. **RLS на всех уровнях**
2. **Шифрование credentials интеграций**
3. **Аудит действий пользователей**
4. **Rate limiting per org**
5. **CSRF protection**

## Производительность

- Ленивая загрузка режимов
- Prefetch при наведении на ModeSwitcher
- Кэширование Mode Registry
- Оптимистичные обновления
- ISR для публичных страниц

## Развертывание

```bash
# Миграция БД
npm run db:migrate

# Сборка
npm run build

# Запуск
npm start
```

## Monitoring Checklist

- [ ] Vercel Analytics для маршрутов
- [ ] Sentry для ошибок
- [ ] Supabase logs для RLS violations
- [ ] Custom metrics для mode usage

---

**Следующий шаг:** Реализация Mode Registry и PlatformShell
