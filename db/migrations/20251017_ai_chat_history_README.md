# Миграция: История AI чатов

## Описание
Добавляет таблицы для хранения истории диалогов с AI ассистентом:
- `ai_chats` - список чатов пользователя
- `ai_messages` - сообщения в чатах

## Как применить миграцию

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Создайте новый query
5. Скопируйте содержимое файла `20251017_ai_chat_history.sql`
6. Вставьте в редактор и нажмите **Run**

### Вариант 2: Через Supabase CLI

```bash
# В корне проекта
cd c:/fin3/finapp

# Применить миграцию
supabase db push --local
# или для production
supabase db push
```

## Проверка

После применения миграции проверьте что таблицы созданы:

```sql
-- Проверить таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_chats', 'ai_messages');

-- Проверить RLS политики
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('ai_chats', 'ai_messages');
```

## Откат миграции (если нужно)

```sql
DROP TRIGGER IF EXISTS update_chat_timestamp ON ai_messages;
DROP FUNCTION IF EXISTS update_ai_chat_updated_at();
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_chats CASCADE;
```

## Тестирование

После применения миграции:

1. Откройте http://localhost:3000/ai-chat
2. Отправьте сообщение в чат
3. Обновите страницу
4. История должна сохраниться (пока что нет загрузки истории при обновлении - это будет в следующем обновлении)

## Следующие шаги

- [ ] Добавить UI для списка чатов
- [ ] Загружать историю при открытии чата
- [ ] Возможность создавать новые чаты
- [ ] Удаление чатов
