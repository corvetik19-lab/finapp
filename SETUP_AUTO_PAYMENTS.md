# 🚀 Быстрая настройка автоматических платежей

## Шаг 1: Применить миграцию

### Способ 1: Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое файла: `db/migrations/20251005_auto_create_loan_payments.sql`
5. Вставьте в редактор и нажмите **Run**

### Способ 2: Через скрипт (если настроены переменные окружения)

```bash
node scripts/apply-loan-payments-migration.mjs
```

## Шаг 2: Проверка работы

### Тестовый запуск

Откройте в браузере или через curl:

```bash
# Локально
curl -X POST http://localhost:3000/api/cron/auto-payments

# Или откройте в браузере
http://localhost:3000/api/cron/auto-payments
```

### Ожидаемый ответ

```json
{
  "success": true,
  "totalCreated": 2,
  "details": {
    "creditCards": { "success": true, "count": 1 },
    "loans": { "success": true, "count": 1 }
  },
  "message": "Успешно создано платежей: 2 (кредитные карты: 1, кредиты: 1)"
}
```

## Шаг 3: Проверка созданных платежей

### В интерфейсе
Перейдите на страницу **Платежи** (`/payments`) и проверьте, появились ли новые записи с пометкой:
- "Платёж по карте: ..."
- "Платёж по кредиту: ..."

### В БД (SQL Editor)
```sql
SELECT 
  name,
  due_date,
  amount_minor / 100.0 as amount_rubles,
  status,
  description
FROM upcoming_payments 
WHERE description LIKE '%Автоматически создано%'
ORDER BY created_at DESC
LIMIT 10;
```

## Что происходит автоматически?

✅ **Каждый день в 9:00 UTC (12:00 МСК)** система проверяет:

### Кредитные карты
- Есть ли задолженность (`balance > 0`)
- Установлена ли дата платежа (`next_payment_date`)
- До платежа осталось ≤ 10 дней

### Кредиты
- Статус `active`
- Установлена ли дата платежа (`next_payment_date`)
- До платежа осталось ≤ 10 дней

Если условия выполнены → создаётся напоминание в разделе **Платежи**.

## Как добавить дату платежа в кредит?

При создании или редактировании кредита заполните поле **"Дата следующего платежа"**.

Пример:
```
Название: Ипотека Сбербанк
Ежемесячный платёж: 25000 руб
Дата следующего платежа: 15.10.2025
```

Система автоматически создаст напоминание **05.10.2025** (за 10 дней).

## Настройка CRON секрета (опционально)

Для защиты endpoint'а в Production:

### Vercel
1. Project Settings → Environment Variables
2. Добавьте: `CRON_SECRET` = `ваш-секретный-токен`
3. Redeploy проект

### Локально
Добавьте в `.env.local`:
```env
CRON_SECRET=ваш-секретный-токен
```

Теперь запросы должны включать заголовок:
```bash
curl -X POST https://your-app.vercel.app/api/cron/auto-payments \
  -H "Authorization: Bearer ваш-секретный-токен"
```

## Устранение неполадок

### Платежи не создаются

1. **Проверьте дату следующего платежа:**
   ```sql
   SELECT name, next_payment_date, status
   FROM loans 
   WHERE status = 'active' AND deleted_at IS NULL;
   ```

2. **Убедитесь, что до платежа ≤ 10 дней:**
   ```sql
   SELECT 
     name,
     next_payment_date,
     next_payment_date - CURRENT_DATE as days_until_payment
   FROM loans 
   WHERE status = 'active' 
     AND next_payment_date IS NOT NULL
     AND next_payment_date >= CURRENT_DATE;
   ```

3. **Запустите функцию вручную:**
   ```sql
   SELECT * FROM auto_create_loan_payments();
   ```

### Функция не найдена

Убедитесь, что миграция была применена успешно. Повторите Шаг 1.

## Дополнительная информация

Подробная документация: `docs/AUTO_PAYMENTS.md`
