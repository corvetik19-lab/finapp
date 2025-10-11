# Sentry - Мониторинг ошибок

## 📚 Что это?

**Sentry** — система отслеживания ошибок в production. Автоматически ловит и логирует все ошибки, которые происходят у пользователей.

## 🎯 Что Sentry делает?

### 1. 🐛 Отслеживание ошибок

```
Пользователь нажал кнопку → JavaScript ошибка
                ↓
        Sentry перехватывает
                ↓
        Отправляет в панель управления
                ↓
    📧 Email разработчику: "Новая ошибка!"
```

### 2. 📊 Детальная информация

Для каждой ошибки вы получаете:
- **Текст ошибки** и stack trace
- **URL** страницы где произошла
- **Браузер** и ОС пользователя
- **Breadcrumbs** - что делал пользователь до ошибки
- **Session Replay** - видеозапись действий (опционально)

### 3. ⚡ Performance Monitoring

- Время загрузки страниц
- Медленные API запросы
- Узкие места в коде

### 4. ⏰ CRON Monitoring

Автоматически отслеживает выполнение CRON задач на Vercel.

## 🔧 Настройка

### Шаг 1: Создать аккаунт Sentry

1. Зайти на [sentry.io](https://sentry.io)
2. Нажать **"Get Started"**
3. Зарегистрироваться (бесплатный план: 5,000 ошибок/месяц)

### Шаг 2: Создать проект

1. В Sentry Dashboard нажать **"Create Project"**
2. Выбрать платформу: **Next.js**
3. Название: **finapp** (или любое)
4. Нажать **"Create Project"**

### Шаг 3: Получить DSN

После создания проекта вы увидите **DSN** (Data Source Name):

```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

Это ключ для подключения.

### Шаг 4: Добавить переменные окружения

#### Локально (.env.local):

```env
# Sentry DSN (публичный, для клиента)
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123

# Sentry организация и проект (для загрузки source maps)
SENTRY_ORG=ваша-организация
SENTRY_PROJECT=finapp

# Auth Token (для загрузки source maps при деплое)
SENTRY_AUTH_TOKEN=sntrys_ваш_токен

# CRON секрет (для защиты endpoints)
CRON_SECRET=ваш_случайный_токен
```

#### В Vercel:

1. **Vercel Dashboard** → Проект → **Settings** → **Environment Variables**
2. Добавить все переменные выше
3. Выбрать окружения: **Production, Preview, Development**

### Шаг 5: Получить Auth Token

Для загрузки source maps (чтобы видеть читаемые stack traces):

1. Sentry Dashboard → **Settings** → **Auth Tokens**
2. **Create New Token**
3. Название: **Vercel Deploy**
4. Scopes: `project:releases`, `project:write`
5. Скопировать токен → добавить в `.env.local` и Vercel

## 📊 Что уже настроено

### 1. Конфигурационные файлы

**sentry.client.config.ts** - для браузера (клиент):
- Отслеживает JavaScript ошибки
- Session Replay (запись сессий)
- Breadcrumbs (действия пользователя)

**sentry.server.config.ts** - для сервера:
- Отслеживает ошибки в API routes
- Server Actions
- Серверные компоненты

**sentry.edge.config.ts** - для Edge Runtime:
- Middleware
- Edge Functions

### 2. Интеграция в next.config.ts

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const sentryConfig = withSentryConfig(
  configWithPWA,
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    
    // Source maps
    widenClientFileUpload: true,
    sourcemaps: { disable: true }, // Отключено для production
    
    // React component names
    reactComponentAnnotation: { enabled: true },
    
    // Обход ad-blockers
    tunnelRoute: "/monitoring",
    
    // Vercel CRON monitoring
    automaticVercelMonitors: true,
  }
);
```

### 3. Автоматические инструменты

- ✅ **Ошибки автоматически отправляются** в Sentry
- ✅ **CRON задачи мониторятся** (automaticVercelMonitors: true)
- ✅ **React компоненты аннотируются** (видите названия компонентов в ошибках)
- ✅ **Ad-blocker bypass** через `/monitoring` tunnel

## 🎨 Использование в коде

### Автоматическое отслеживание

Большинство ошибок **отслеживаются автоматически**:

```typescript
// Ошибка в React компоненте
function MyComponent() {
  const [data, setData] = useState();
  
  return <div>{data.name}</div>; // ❌ TypeError автоматически в Sentry
}

// Ошибка в API route
export async function GET() {
  throw new Error("Something went wrong"); // ❌ Автоматически в Sentry
}
```

### Ручное логирование

Иногда нужно отправить информацию вручную:

```typescript
import * as Sentry from "@sentry/nextjs";

// Залогировать ошибку
try {
  await dangerousOperation();
} catch (error) {
  Sentry.captureException(error);
  // Или с контекстом:
  Sentry.captureException(error, {
    tags: {
      section: "transactions",
      operation: "create",
    },
    extra: {
      transactionData: data,
      userId: user.id,
    },
  });
}

// Залогировать сообщение (не ошибку)
Sentry.captureMessage("Important event happened", "warning");

// Добавить breadcrumb (след действия пользователя)
Sentry.addBreadcrumb({
  category: "auth",
  message: "User logged in",
  level: "info",
});
```

### Настройка контекста пользователя

```typescript
// После авторизации:
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
});

// При выходе:
Sentry.setUser(null);
```

Теперь в каждой ошибке будет информация о пользователе.

### Группировка ошибок (Fingerprinting)

```typescript
Sentry.captureException(error, {
  fingerprint: ["transaction-validation-error", errorCode],
});
```

Ошибки с одинаковым fingerprint будут сгруппированы.

## 📊 Панель управления Sentry

### Issues (Проблемы)

**Что вы видите:**
```
❌ TypeError: Cannot read property 'amount' of undefined
   📍 app/transactions/page.tsx:45
   👤 igor@mastersql.ru
   🔢 Произошло: 12 раз
   📅 Последний раз: 2 минуты назад
```

**Детали:**
- **Stack Trace** - где именно ошибка
- **Breadcrumbs** - что делал пользователь
- **Tags** - метки для фильтрации
- **User Context** - информация о пользователе
- **Device** - браузер, ОС, разрешение экрана

### Performance

**Транзакции:**
- Время загрузки страниц
- API запросы
- Database queries

**Пример:**
```
🐌 /transactions - 3.2 секунды (медленно!)
   - Next.js SSR: 1.2s
   - Supabase query: 1.8s ← Узкое место!
   - Rendering: 0.2s
```

### Crons

**Мониторинг CRON задач:**
```
✅ /api/ai/monthly-insights
   - Последний запуск: 1 час назад
   - Статус: Success
   - Время выполнения: 2.3s

❌ /api/cron/auto-payments
   - Последний запуск: 3 часа назад
   - Статус: Failed
   - Ошибка: Database connection timeout
```

## 🔔 Настройка алертов

### Email уведомления:

1. **Sentry Dashboard** → Проект → **Alerts**
2. **Create Alert Rule**
3. Настроить:
   - **When:** новая ошибка / количество превысило N
   - **If:** условия фильтрации
   - **Then:** отправить email / Slack / Discord

**Примеры правил:**

```
Правило 1: "Критические ошибки"
- When: issue is first seen
- If: level = error AND environment = production
- Then: email to team@company.com

Правило 2: "Частые ошибки"
- When: issue count >= 10
- If: timeframe = 1 hour
- Then: Slack notification

Правило 3: "CRON failures"
- When: cron job fails
- If: path starts with /api/cron/
- Then: email immediately
```

## 🧪 Тестирование Sentry

### Тестовая ошибка:

```typescript
// Создать страницу для теста
// app/test-sentry/page.tsx
"use client";

import * as Sentry from "@sentry/nextjs";

export default function TestSentry() {
  return (
    <div>
      <h1>Тест Sentry</h1>
      
      <button onClick={() => {
        throw new Error("Test error from client!");
      }}>
        Client Error
      </button>
      
      <button onClick={() => {
        Sentry.captureMessage("Test message", "info");
      }}>
        Send Message
      </button>
      
      <button onClick={async () => {
        await fetch("/api/test-sentry-error");
      }}>
        Server Error
      </button>
    </div>
  );
}
```

```typescript
// API route для теста
// app/api/test-sentry-error/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  throw new Error("Test error from server!");
}
```

Откройте `/test-sentry` и нажмите кнопки. Ошибки появятся в Sentry Dashboard!

## 🎯 Best Practices

### 1. Не логировать чувствительные данные

```typescript
// ❌ ПЛОХО
Sentry.captureException(error, {
  extra: {
    password: user.password, // Не отправлять пароли!
    creditCard: user.card,   // Не отправлять платёжные данные!
  },
});

// ✅ ХОРОШО
Sentry.captureException(error, {
  extra: {
    userId: user.id,
    action: "payment_failed",
  },
});
```

### 2. Фильтровать шум

Некоторые ошибки не важны:

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: "...",
  
  // Игнорировать определённые ошибки
  ignoreErrors: [
    "ResizeObserver loop limit exceeded", // Браузерный баг
    "Non-Error promise rejection", // React hydration
    /^Loading chunk \d+ failed/, // Network errors при загрузке
  ],
  
  // Игнорировать определённые URL
  denyUrls: [
    /extensions\//i, // Расширения браузера
    /chrome-extension/i,
  ],
});
```

### 3. Sample Rate в production

Не отправлять 100% событий (экономия квоты):

```typescript
Sentry.init({
  dsn: "...",
  
  // Отправлять все ошибки (важно!)
  sampleRate: 1.0,
  
  // Отправлять 10% performance данных
  tracesSampleRate: 0.1,
  
  // Отправлять 10% session replay
  replaysSessionSampleRate: 0.1,
  
  // Но 100% replay при ошибке
  replaysOnErrorSampleRate: 1.0,
});
```

### 4. Releases и Source Maps

При деплое создаётся **Release** с версией:

```typescript
// Автоматически в next.config.ts
{
  release: {
    name: process.env.VERCEL_GIT_COMMIT_SHA,
    create: true,
    finalize: true,
  }
}
```

Теперь в Sentry видно **в какой версии** появилась ошибка!

## 📈 Квота и лимиты

### Free Plan:
- ✅ **5,000 ошибок/месяц**
- ✅ **10,000 performance events/месяц**
- ✅ **1 проект**
- ✅ **30 дней хранения**
- ✅ **Базовые алерты**

### Developer Plan ($29/мес):
- ✅ **50,000 ошибок/месяц**
- ✅ **100,000 performance events/месяц**
- ✅ **Неограниченные проекты**
- ✅ **90 дней хранения**
- ✅ **Продвинутые алерты**
- ✅ **Session Replay**

### Оптимизация квоты:

```typescript
// Использовать sample rate
tracesSampleRate: 0.1, // Только 10% performance данных

// Фильтровать транзакции
beforeSendTransaction(transaction) {
  // Не отправлять статику
  if (transaction.name.includes("/_next/static/")) {
    return null;
  }
  return transaction;
}
```

## 🚀 Деплой

После настройки переменных окружения в Vercel:

```bash
# Закоммитить изменения
git add .
git commit -m "Setup Sentry monitoring"
git push

# Vercel автоматически задеплоит с Sentry!
```

При деплое:
1. ✅ Source maps загрузятся в Sentry
2. ✅ Release создастся автоматически
3. ✅ Мониторинг начнёт работать

## 📚 Полезные ссылки

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Cron Monitoring](https://docs.sentry.io/product/crons/)

---

**Статус:** ✅ Настроено и готово к использованию  
**Версия:** 1.0  
**Дата:** 2025-10-11

## ⚠️ Важно перед production

1. ✅ Получить Sentry DSN
2. ✅ Добавить переменные в Vercel
3. ✅ Создать Auth Token
4. ✅ Настроить алерты
5. ✅ Протестировать на staging
6. ✅ Задеплоить на production
