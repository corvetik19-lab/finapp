-- Миграция: исправление unique constraint для employees
-- Старый constraint не учитывал deleted_at, что блокировало повторное создание сотрудника
-- после его удаления (soft delete)

-- Удаляем старый constraint который не учитывает deleted_at
ALTER TABLE employees DROP CONSTRAINT IF EXISTS unique_user_company;

-- Создаём частичный уникальный индекс только для активных сотрудников
-- Это позволяет создавать нового сотрудника с тем же user_id если предыдущий был удалён
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_user_company 
ON employees(user_id, company_id) 
WHERE deleted_at IS NULL;
