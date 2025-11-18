-- Миграция: Добавление времени исполнения задачи
-- Дата: 2025-11-15
-- Описание: Добавляем поле due_time (время) для задач тендеров

ALTER TABLE tender_tasks
  ADD COLUMN IF NOT EXISTS due_time TIME;

COMMENT ON COLUMN tender_tasks.due_time IS 'Время выполнения задачи (часы:минуты)';
