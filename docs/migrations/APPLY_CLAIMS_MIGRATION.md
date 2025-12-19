# Применение миграции для системы взыскания долгов

## Описание
Миграция расширяет таблицу `debts` для поддержки полноценной системы претензионной работы по образцу CRM.

## Новые поля
- `tender_id` - связь с тендером
- `application_number` - номер заявки
- `contract_number` - номер договора
- `stage` - этап взыскания (new, claim, court, writ, bailiff, paid)
- `plaintiff` - истец (наша организация)
- `defendant` - ответчик (должник)
- `comments` - комментарии по претензии

## Применение миграции

### Через Supabase Dashboard (SQL Editor)

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте содержимое файла `db/migrations/20251119_extend_debts_for_claims.sql`
4. Вставьте в редактор и выполните

### Через Supabase CLI

```bash
# Если используете Supabase CLI
supabase db push
```

### Вручную через psql

```bash
psql -h <your-db-host> -U postgres -d postgres -f db/migrations/20251119_extend_debts_for_claims.sql
```

## Проверка

После применения миграции проверьте структуру таблицы:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'debts'
ORDER BY ordinal_position;
```

Должны появиться новые колонки:
- tender_id (uuid, nullable)
- application_number (text, nullable)
- contract_number (text, nullable)
- stage (text, not null, default 'new')
- plaintiff (text, nullable)
- defendant (text, nullable)
- comments (text, nullable)

## Откат миграции (если нужно)

```sql
ALTER TABLE debts DROP COLUMN IF EXISTS tender_id;
ALTER TABLE debts DROP COLUMN IF EXISTS application_number;
ALTER TABLE debts DROP COLUMN IF EXISTS contract_number;
ALTER TABLE debts DROP COLUMN IF EXISTS stage;
ALTER TABLE debts DROP COLUMN IF EXISTS plaintiff;
ALTER TABLE debts DROP COLUMN IF EXISTS defendant;
ALTER TABLE debts DROP COLUMN IF EXISTS comments;

DROP INDEX IF EXISTS idx_debts_tender_id;
DROP INDEX IF EXISTS idx_debts_stage;
DROP INDEX IF EXISTS idx_debts_application_number;
```
