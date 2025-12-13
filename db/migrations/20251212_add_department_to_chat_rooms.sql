-- =====================================================
-- МИГРАЦИЯ: Добавление поля department в chat_rooms
-- Дата: 12.12.2024
-- =====================================================

-- Добавляем поле department для чатов по отделам
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Обновляем constraint для типа чата, добавляя 'department'
ALTER TABLE chat_rooms 
DROP CONSTRAINT IF EXISTS chat_rooms_type_check;

ALTER TABLE chat_rooms 
ADD CONSTRAINT chat_rooms_type_check 
CHECK (type IN ('tender', 'team', 'private', 'general', 'department'));
