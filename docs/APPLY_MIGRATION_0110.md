# Инструкция по применению миграции 0110

## Миграция: Добавление категорий файлов

Файл миграции: `db/migrations/0110_add_category_to_tender_attachments.sql`

### Что добавляется:
1. **Поле `category`** - категория файла (tender, calculation, submission, contract)
2. **Поле `comment`** - комментарий к файлу
3. **Индекс** для быстрого поиска по категории

### Как применить миграцию:

#### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите проект `zfvlgpwqcqvqmwjhqvhj`
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое файла `db/migrations/0110_add_category_to_tender_attachments.sql`
5. Вставьте в редактор и нажмите **Run**

#### Вариант 2: Через Supabase CLI

```bash
# Если у вас установлен Supabase CLI
supabase db push
```

### SQL для выполнения:

```sql
-- Добавляем поле category
ALTER TABLE tender_attachments 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'tender' 
CHECK (category IN ('tender', 'calculation', 'submission', 'contract'));

-- Добавляем поле comment для комментариев к файлам
ALTER TABLE tender_attachments 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Обновляем существующие записи (если есть)
UPDATE tender_attachments 
SET category = 'tender' 
WHERE category IS NULL;

-- Создаём индекс для быстрого поиска по категории
CREATE INDEX IF NOT EXISTS idx_tender_attachments_category 
ON tender_attachments(tender_id, category);
```

### Проверка:

После применения миграции выполните:

```sql
-- Проверка структуры таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tender_attachments'
AND column_name IN ('category', 'comment');

-- Проверка индекса
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tender_attachments'
AND indexname = 'idx_tender_attachments_category';
```

### После применения:

Вкладка "Файлы" в тендерах будет работать с категориями:
- 📁 Файлы тендера
- 📊 Файлы просчета
- 📤 Файлы на подачу
- 📄 Контракт

Также можно будет добавлять комментарии к каждому файлу.
