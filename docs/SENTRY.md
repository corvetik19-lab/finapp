# 📊 Sentry — Мониторинг ошибок

> **Статус:** ✅ Настроено и готово к использованию  
> **Организация:** finapp-0b  
> **Проект:** javascript-nextjs

---

## 📋 Содержание

1. [Что это](#что-это)
2. [Возможности](#возможности)
3. [Настройка](#настройка)
4. [Конфигурация](#конфигурация)
5. [Использование в коде](#использование-в-коде)
6. [Панель управления](#панель-управления)
7. [Алерты](#настройка-алертов)
8. [Best Practices](#best-practices)

---

## Что это

**Sentry** — система отслеживания ошибок в production. Автоматически ловит и логирует все ошибки, которые происходят у пользователей.

```
Пользователь нажал кнопку → JavaScript ошибка
                ↓
        Sentry перехватывает
                ↓
        Отправляет в панель управления
                ↓
    📧 Email разработчику: "Новая ошибка!"
```

---

## Возможности

### Отслеживание ошибок

Для каждой ошибки вы получаете:
- **Текст ошибки** и stack trace
- **URL** страницы где произошла
- **Браузер** и ОС пользователя
- **Breadcrumbs** — что делал пользователь до ошибки
- **Session Replay** — видеозапись действий (опционально)

### Performance Monitoring

- Время загрузки страниц
- Медленные API запросы
- Узкие места в коде

### CRON Monitoring

Автоматически отслеживает выполнение CRON задач на Vercel.

---

## Настройка

### Шаг 1: Переменные окружения

Добавьте в `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

> **Примечание:** Получите значения из Sentry Dashboard → Settings

### Шаг 2: Vercel (production)

1. **Vercel Dashboard** → Проект → **Settings** → **Environment Variables**
2. Добавьте все 4 переменные выше
3. Выберите окружения: **Production, Preview, Development**

### Шаг 3: Перезапуск

```bash
# Остановите текущий сервер (Ctrl+C)
npm run dev
```

---

## Конфигурация

### Конфигурационные файлы

**sentry.client.config.ts** — для браузера:
- JavaScript ошибки
- Session Replay
- Breadcrumbs

**sentry.server.config.ts** — для сервера:
- API routes
- Server Actions
- Серверные компоненты

**sentry.edge.config.ts** — для Edge Runtime:
- Middleware
- Edge Functions

### Интеграция в next.config.ts

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const sentryConfig = withSentryConfig(configWithPWA, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",        // Ad-blocker bypass
  automaticVercelMonitors: true,     // CRON monitoring
});
```

### Что работает автоматически

- ✅ Ошибки отправляются в Sentry
- ✅ CRON задачи мониторятся
- ✅ React компоненты аннотируются
- ✅ Ad-blocker bypass через `/monitoring`

---

## Использование в коде

### Автоматическое отслеживание

Большинство ошибок отслеживаются автоматически:

```typescript
// Ошибка в React компоненте
function MyComponent() {
  return <div>{data.name}</div>; // ❌ TypeError → Sentry
}

// Ошибка в API route
export async function GET() {
  throw new Error("Something went wrong"); // ❌ → Sentry
}
```

### Ручное логирование

```typescript
import * as Sentry from "@sentry/nextjs";

// Залогировать ошибку
try {
  await dangerousOperation();
} catch (error) {
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

// Залогировать сообщение
Sentry.captureMessage("Important event happened", "warning");

// Добавить breadcrumb
Sentry.addBreadcrumb({
  category: "auth",
  message: "User logged in",
  level: "info",
});
```

### Контекст пользователя

```typescript
// После авторизации
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
});

// При выходе
Sentry.setUser(null);
```

---

## Панель управления

### Issues (Проблемы)

```
❌ TypeError: Cannot read property 'amount' of undefined
   📍 app/transactions/page.tsx:45
   👤 igor@mastersql.ru
   🔢 Произошло: 12 раз
   📅 Последний раз: 2 минуты назад
```

**Детали:**
- Stack Trace
- Breadcrumbs
- Tags
- User Context
- Device

### Performance

```
🐌 /transactions - 3.2 секунды (медленно!)
   - Next.js SSR: 1.2s
   - Supabase query: 1.8s ← Узкое место!
   - Rendering: 0.2s
```

### Crons

```
✅ /api/ai/monthly-insights
   - Последний запуск: 1 час назад
   - Статус: Success
   - Время: 2.3s

❌ /api/cron/auto-payments
   - Статус: Failed
   - Ошибка: Database connection timeout
```

### Ссылки

- **Dashboard:** https://finapp-0b.sentry.io/
- **Issues:** https://finapp-0b.sentry.io/issues/
- **Performance:** https://finapp-0b.sentry.io/performance/
- **Crons:** https://finapp-0b.sentry.io/crons/

---

## Настройка алертов

### Email уведомления

1. **Sentry Dashboard** → Проект → **Alerts**
2. **Create Alert Rule**
3. Настроить правила:

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
- Then: email immediately
```

---

## Best Practices

### Не логировать чувствительные данные

```typescript
// ❌ ПЛОХО
Sentry.captureException(error, {
  extra: {
    password: user.password,
    creditCard: user.card,
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

### Фильтровать шум

```typescript
Sentry.init({
  dsn: "...",
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
    /^Loading chunk \d+ failed/,
  ],
  denyUrls: [
    /extensions\//i,
    /chrome-extension/i,
  ],
});
```

### Sample Rate в production

```typescript
Sentry.init({
  dsn: "...",
  sampleRate: 1.0,                  // Все ошибки
  tracesSampleRate: 0.1,            // 10% performance
  replaysSessionSampleRate: 0.1,    // 10% replay
  replaysOnErrorSampleRate: 1.0,    // 100% replay при ошибке
});
```

---

## Квота и лимиты

### Free Plan

- ✅ 5,000 ошибок/месяц
- ✅ 10,000 performance events/месяц
- ✅ 1 проект
- ✅ 30 дней хранения

### Developer Plan ($29/мес)

- ✅ 50,000 ошибок/месяц
- ✅ 100,000 performance events/месяц
- ✅ Неограниченные проекты
- ✅ 90 дней хранения
- ✅ Session Replay

---

## Тестирование

Создайте тестовую ошибку:

```typescript
throw new Error("Test Sentry!");
```

Откройте https://finapp-0b.sentry.io/issues/ — должна появиться новая ошибка!

---

**Sentry полностью интегрирован и готов к работе!** 🚀
