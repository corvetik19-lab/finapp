-- Включаем Realtime для таблицы attachments
-- Это позволяет синхронизировать изменения в реальном времени между устройствами

ALTER PUBLICATION supabase_realtime ADD TABLE attachments;

-- Проверка: таблица должна быть в списке публикаций
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attachments';
