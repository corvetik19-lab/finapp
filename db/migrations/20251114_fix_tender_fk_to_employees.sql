-- Миграция: Исправление FK для ответственных в тендерах
-- Дата: 2025-11-14
-- Описание: Меняем FK с auth.users на employees, чтобы можно было назначать сотрудников

-- Удаляем старые FK constraints
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_manager_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_specialist_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_investor_id_fkey;
ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_executor_id_fkey;

-- Добавляем новые FK constraints на таблицу employees
ALTER TABLE tenders 
  ADD CONSTRAINT tenders_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE tenders 
  ADD CONSTRAINT tenders_specialist_id_fkey 
  FOREIGN KEY (specialist_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE tenders 
  ADD CONSTRAINT tenders_investor_id_fkey 
  FOREIGN KEY (investor_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE tenders 
  ADD CONSTRAINT tenders_executor_id_fkey 
  FOREIGN KEY (executor_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Комментарии для документации
COMMENT ON COLUMN tenders.manager_id IS 'UUID сотрудника-менеджера из таблицы employees (обязательно)';
COMMENT ON COLUMN tenders.specialist_id IS 'UUID сотрудника-специалиста из таблицы employees (обязательно)';
COMMENT ON COLUMN tenders.investor_id IS 'UUID сотрудника-инвестора из таблицы employees (опционально)';
COMMENT ON COLUMN tenders.executor_id IS 'UUID сотрудника-исполнителя из таблицы employees (опционально)';
