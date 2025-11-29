-- Включаем Realtime для таблицы attachments
-- Это позволяет синхронизировать изменения в реальном времени между устройствами

-- Добавляем таблицу в публикацию Realtime (если ещё не добавлена)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attachments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE attachments;
    END IF;
END $$;

-- Устанавливаем replica identity full для получения всех полей при DELETE
-- Это нужно для фильтрации по user_id при удалении записей
ALTER TABLE attachments REPLICA IDENTITY FULL;

-- Проверка: таблица должна быть в списке публикаций
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attachments';
