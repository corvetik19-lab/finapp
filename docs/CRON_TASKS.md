# CRON задачи на Vercel

## 📚 Что это?

Автоматические задачи, которые запускаются **по расписанию** без вашего участия на сервере Vercel.

## 🎯 Настроенные задачи

### 1. 💳 Автосоздание платежей (`/api/cron/auto-payments`)

**Расписание:** Каждый день в 9:00 утра  
**CRON:** `0 9 * * *`

**Что делает:**
- Создаёт платежи по кредитам (если срок погашения наступил)
- Создаёт платежи по кредитным картам (минимальный платёж)
- Списывает/пополняет "кубышку" (виртуальный лимит)

**Файл:** `app/api/cron/auto-payments/route.ts`

### 2. 🤖 Генерация embeddings (`/api/ai/generate-embeddings`)

**Расписание:** Каждую ночь в 2:00  
**CRON:** `0 2 * * *`

**Что делает:**
- Находит транзакции без embeddings
- Создаёт векторные представления через OpenAI
- Сохраняет в поле `embedding` (pgvector)
- Обеспечивает работу семантического поиска

**Файл:** `app/api/ai/generate-embeddings/route.ts`

### 3. 📊 Ежемесячные AI инсайты (`/api/ai/monthly-insights`)

**Расписание:** 1-го числа каждого месяца в 9:00  
**CRON:** `0 9 1 * *`

**Что делает:**
- Анализирует все транзакции прошлого месяца
- Создаёт AI-сводку с помощью GPT-4o-mini
- Сохраняет в таблицу `ai_summaries`
- Пользователь видит инсайты в интерфейсе

**Файл:** `app/api/ai/monthly-insights/route.ts`

## 🔧 Конфигурация

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-payments",
      "schedule": "0 9 * * *",
      "description": "Автосоздание платежей (9:00)"
    },
    {
      "path": "/api/ai/generate-embeddings",
      "schedule": "0 2 * * *",
      "description": "Генерация embeddings (2:00)"
    },
    {
      "path": "/api/ai/monthly-insights",
      "schedule": "0 9 1 * *",
      "description": "Ежемесячные инсайты (9:00, 1-го числа)"
    }
  ]
}
```

### Формат CRON расписания

```
┌───────────── минута (0 - 59)
│ ┌───────────── час (0 - 23)
│ │ ┌───────────── день месяца (1 - 31)
│ │ │ ┌───────────── месяц (1 - 12)
│ │ │ │ ┌───────────── день недели (0 - 7, 0 и 7 = воскресенье)
│ │ │ │ │
* * * * *
```

**Примеры:**

| CRON | Расписание |
|------|------------|
| `0 9 * * *` | Каждый день в 9:00 |
| `0 2 * * *` | Каждый день в 2:00 |
| `0 9 1 * *` | 1-го числа каждого месяца в 9:00 |
| `0 0 * * 0` | Каждое воскресенье в полночь |
| `*/15 * * * *` | Каждые 15 минут |

## 🔒 Безопасность

### Защита от неавторизованного доступа

Все CRON endpoints требуют секретный токен:

```typescript
// В каждом CRON endpoint:
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Настройка в Vercel:

1. Зайти в **Vercel Dashboard**
2. Проект → **Settings** → **Environment Variables**
3. Добавить:
   ```
   Name: CRON_SECRET
   Value: [сгенерировать длинный случайный токен]
   ```

**Генерация токена:**
```bash
# В терминале:
openssl rand -hex 32
```

Скопировать результат и вставить в Vercel.

## 📊 Мониторинг CRON задач

### В Vercel Dashboard:

1. Зайти в проект
2. **Deployments** → нажать на актуальный deployment
3. **Functions** → найти CRON endpoints
4. Смотреть логи выполнения

### Через Sentry (автоматически):

Если Sentry настроен, все CRON задачи автоматически отслеживаются:

```typescript
// В next.config.ts уже настроено:
automaticVercelMonitors: true
```

В панели Sentry → **Crons** можно увидеть:
- ✅ Успешные выполнения
- ❌ Ошибки
- ⏱️ Время выполнения
- 📊 Статистика

## 🧪 Тестирование локально

### Запустить CRON endpoint вручную:

```bash
# С правильным токеном:
curl -X GET http://localhost:3000/api/ai/monthly-insights \
  -H "Authorization: Bearer your-cron-secret"

# Или в браузере/Postman:
GET http://localhost:3000/api/ai/monthly-insights
Header: Authorization: Bearer your-cron-secret
```

### Без токена (получите 401):

```bash
curl http://localhost:3000/api/ai/monthly-insights
# Response: {"error":"Unauthorized"}
```

## 📝 Создание нового CRON endpoint

### Шаг 1: Создать API route

```typescript
// app/api/your-task/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // Проверка авторизации
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();

    // Ваша логика здесь
    // ...

    return NextResponse.json({
      success: true,
      message: "Task completed",
    });
  } catch (error) {
    console.error("CRON task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Шаг 2: Добавить в vercel.json

```json
{
  "crons": [
    // ... существующие
    {
      "path": "/api/your-task",
      "schedule": "0 10 * * *",
      "description": "Ваша задача (10:00)"
    }
  ]
}
```

### Шаг 3: Задеплоить на Vercel

```bash
git add .
git commit -m "Add new CRON task"
git push
```

CRON задача начнёт работать автоматически после деплоя!

## ⚠️ Ограничения Vercel CRON

### Free Plan:
- ✅ Доступны CRON задачи
- ⚠️ Максимум **1 задача в минуту** для всего аккаунта
- ⚠️ Timeout: **10 секунд**

### Pro Plan:
- ✅ Неограниченные CRON задачи
- ✅ Timeout: **5 минут**
- ✅ Приоритетное выполнение

### Для длительных задач:

Если задача занимает > 10 секунд (Free) или > 5 минут (Pro):

1. **Разбить на части:**
```typescript
// Обрабатывать порциями
const BATCH_SIZE = 100;
for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

2. **Использовать очередь:**
- Vercel не поддерживает background jobs
- Рассмотреть: **Upstash QStash**, **Inngest**, **Trigger.dev**

## 📊 Пример: Статистика из monthly-insights

```json
{
  "success": true,
  "message": "Monthly insights generated",
  "results": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "status": "success"
    },
    {
      "user_id": "uuid2",
      "email": "user2@example.com",
      "status": "error",
      "error": "No transactions found"
    }
  ],
  "processed": 2,
  "successful": 1,
  "failed": 1
}
```

## 🔔 Уведомления при ошибках

### Настройка алертов в Sentry:

1. Зайти в **Sentry Dashboard**
2. **Alerts** → **Create Alert**
3. Выбрать:
   - **Alert type:** Issues
   - **Filter:** `path:/api/ai/monthly-insights`
   - **Condition:** When an issue is seen
4. **Actions:** Email / Slack / Discord

Теперь при ошибке в CRON задаче придёт уведомление!

## 🎯 Best Practices

### 1. Идемпотентность

CRON задача должна **безопасно выполняться несколько раз**:

```typescript
// ✅ ХОРОШО: Проверяем что не создано уже
const existing = await supabase
  .from("payments")
  .select("id")
  .eq("loan_id", loanId)
  .eq("month", currentMonth)
  .single();

if (!existing) {
  // Создаём только если нет
  await supabase.from("payments").insert({ ... });
}
```

```typescript
// ❌ ПЛОХО: Создаём без проверки
await supabase.from("payments").insert({ ... });
// Может создать дубликаты!
```

### 2. Логирование

```typescript
console.log("[CRON] Starting monthly insights generation");
console.log(`[CRON] Processing ${users.length} users`);
console.log(`[CRON] Complete: ${success} success, ${failed} failed`);
```

Логи доступны в Vercel Dashboard.

### 3. Обработка ошибок

```typescript
// Продолжать даже если один пользователь упал
for (const user of users) {
  try {
    await processUser(user);
  } catch (error) {
    console.error(`Failed for user ${user.id}:`, error);
    // Продолжить с следующим
  }
}
```

### 4. Таймауты

```typescript
// Для Free плана важно уложиться в 10 секунд
const TIMEOUT = 9000; // 9 секунд
const startTime = Date.now();

for (const item of items) {
  if (Date.now() - startTime > TIMEOUT) {
    console.log("[CRON] Timeout approaching, stopping");
    break;
  }
  await processItem(item);
}
```

## 📚 Полезные ссылки

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Crontab Guru](https://crontab.guru/) - визуальный редактор CRON расписаний
- [Sentry Cron Monitoring](https://docs.sentry.io/product/crons/)

---

**Статус:** ✅ Настроено и работает  
**Версия:** 1.0  
**Дата:** 2025-10-11
