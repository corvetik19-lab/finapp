# Применение миграций к базе данных

## Способ 1: Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (слева в меню)
4. Скопируйте содержимое файла миграции `db/migrations/009_create_roles_table.sql`
5. Вставьте в редактор
6. Нажмите **Run** или `Ctrl+Enter`

## Способ 2: Через Supabase CLI

```bash
# Установите Supabase CLI (если еще не установлен)
npm install -g supabase

# Войдите в Supabase
supabase login

# Свяжите проект
supabase link --project-ref your-project-ref

# Примените миграцию
supabase db push
```

## Способ 3: Прямое выполнение SQL

Подключитесь к вашей базе данных через любой PostgreSQL клиент и выполните:

```sql
-- Скопируйте содержимое файла migrations/009_create_roles_table.sql
```

## Быстрая проверка

После применения миграции проверьте что таблица создана:

```sql
SELECT * FROM roles LIMIT 1;
```

Если команда выполнилась без ошибок - миграция применена успешно! ✅
