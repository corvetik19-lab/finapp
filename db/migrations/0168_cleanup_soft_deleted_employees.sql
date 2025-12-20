-- Удаляем все "мягко удалённые" записи сотрудников
DELETE FROM employees WHERE deleted_at IS NOT NULL;

-- Удаляем constraint и создаём новый индекс
ALTER TABLE employees DROP CONSTRAINT IF EXISTS unique_email_company;
CREATE UNIQUE INDEX IF NOT EXISTS unique_email_company ON employees (email, company_id);
