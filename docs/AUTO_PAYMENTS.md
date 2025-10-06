# Автоматическое создание платежей

## Описание

Система автоматически создаёт напоминания о предстоящих платежах за **10 дней** до срока оплаты для:
- **Кредитных карт** (из таблицы `accounts`)
- **Кредитов** (из таблицы `loans`)

## Как это работает

### 1. Функции PostgreSQL

#### `auto_create_credit_card_payments()`
Создаёт платежи для кредитных карт, у которых:
- Есть задолженность (`balance > 0`)
- Установлена дата следующего платежа (`next_payment_date`)
- До платежа осталось ≤ 10 дней

#### `auto_create_loan_payments()`
Создаёт платежи для кредитов, у которых:
- Статус `active`
- Установлена дата следующего платежа (`next_payment_date`)
- До платежа осталось ≤ 10 дней

### 2. API Endpoints

#### `/api/cron/auto-payments` (рекомендуется)
Запускает обе функции одновременно.

```bash
# Тестовый запуск (без авторизации)
curl -X POST http://localhost:3000/api/cron/auto-payments

# Продакшн (с секретным токеном)
curl -X POST https://your-app.vercel.app/api/cron/auto-payments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### `/api/cron/credit-card-payments`
Только для кредитных карт.

#### `/api/cron/loan-payments`
Только для кредитов.

### 3. Автоматический запуск (CRON)

В `vercel.json` настроен ежедневный запуск в **9:00 UTC (12:00 МСК)**:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-payments",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Настройка

### 1. Применить миграции

```bash
# Функция для кредитных карт (уже должна быть применена)
# db/migrations/20251005_auto_create_credit_card_payments.sql

# Функция для кредитов (новая)
# db/migrations/20251005_auto_create_loan_payments.sql
```

Применить через Supabase Dashboard → SQL Editor или через CLI.

### 2. Настроить секретный токен (опционально)

Для защиты endpoint'а от несанкционированного доступа:

**Локально (.env.local):**
```env
CRON_SECRET=your-secret-token-here
```

**Vercel:**
1. Project Settings → Environment Variables
2. Добавить: `CRON_SECRET` = `your-secret-token-here`

### 3. Проверка работы

#### Ручной запуск (локально):
```bash
curl -X POST http://localhost:3000/api/cron/auto-payments
```

#### Проверка статуса:
```bash
curl http://localhost:3000/api/cron/auto-payments
```

#### SQL-проверка:
```sql
-- Вызов функций напрямую
SELECT * FROM auto_create_credit_card_payments();
SELECT * FROM auto_create_loan_payments();

-- Проверка созданных платежей
SELECT * FROM upcoming_payments 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Логика создания платежей

### Проверка дубликатов
Система не создаёт дубликатов. Проверяется:
- `user_id`
- `account_name` (название карты/кредита)
- `due_date` (дата платежа)
- `status = 'pending'`

### Поля создаваемого платежа

```typescript
{
  name: "Платёж по карте: Название" | "Платёж по кредиту: Название",
  due_date: next_payment_date,
  amount_minor: min_payment | monthly_payment, // в копейках
  currency: "RUB",
  account_name: "Название карты/кредита",
  direction: "expense",
  status: "pending",
  description: "Автоматически создано за 10 дней до срока оплаты..."
}
```

## Мониторинг

### Логи Vercel
В Production → Functions → Logs можно отслеживать выполнение CRON задач.

### Метрики
Ответ endpoint'а содержит статистику:
```json
{
  "success": true,
  "totalCreated": 3,
  "details": {
    "creditCards": { "success": true, "count": 2 },
    "loans": { "success": true, "count": 1 }
  }
}
```

## Устранение неполадок

### Платежи не создаются

1. **Проверить дату `next_payment_date`:**
   ```sql
   SELECT name, next_payment_date, 
          (next_payment_date - CURRENT_DATE) as days_until
   FROM accounts 
   WHERE type = 'card' AND credit_limit IS NOT NULL;

   SELECT name, next_payment_date,
          (next_payment_date - CURRENT_DATE) as days_until
   FROM loans 
   WHERE status = 'active';
   ```

2. **Проверить условия фильтрации:**
   - Для карт: `balance > 0`, `deleted_at IS NULL`
   - Для кредитов: `status = 'active'`, `deleted_at IS NULL`

3. **Запустить функцию вручную:**
   ```sql
   SELECT * FROM auto_create_loan_payments();
   ```

### CRON не запускается

1. Проверить `vercel.json` в корне проекта
2. Пересоздать деплой: `vercel --prod`
3. Проверить логи: Vercel Dashboard → Functions

## Будущие улучшения

- [ ] Настройка периода заранее (не только 10 дней)
- [ ] Уведомления по email/push при создании платежа
- [ ] История запусков CRON задач
- [ ] Интеграция с календарём
