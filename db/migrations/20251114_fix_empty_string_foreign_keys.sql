-- Миграция: Исправление пустых строк в foreign key полях
-- Дата: 2025-11-14
-- Описание: Заменяет пустые строки на NULL в UUID полях с foreign key

-- Исправляем существующие записи
UPDATE tenders 
SET 
  manager_id = NULLIF(manager_id::text, '')::uuid,
  specialist_id = NULLIF(specialist_id::text, '')::uuid,
  investor_id = NULLIF(investor_id::text, '')::uuid,
  executor_id = NULLIF(executor_id::text, '')::uuid,
  type_id = NULLIF(type_id::text, '')::uuid
WHERE 
  manager_id::text = '' 
  OR specialist_id::text = '' 
  OR investor_id::text = '' 
  OR executor_id::text = '' 
  OR type_id::text = ''
  OR manager_id IS NOT NULL
  OR specialist_id IS NOT NULL;

-- Добавляем CHECK constraint для предотвращения пустых строк в будущем
-- (опционально, если нужна дополнительная защита на уровне БД)

-- Комментарий для документации
COMMENT ON COLUMN tenders.manager_id IS 'UUID менеджера (NULL если не назначен, не должно быть пустой строки)';
COMMENT ON COLUMN tenders.specialist_id IS 'UUID специалиста (NULL если не назначен, не должно быть пустой строки)';
COMMENT ON COLUMN tenders.investor_id IS 'UUID инвестора (NULL если не назначен, не должно быть пустой строки)';
COMMENT ON COLUMN tenders.executor_id IS 'UUID исполнителя (NULL если не назначен, не должно быть пустой строки)';
COMMENT ON COLUMN tenders.type_id IS 'UUID типа тендера (NULL если не указан, не должно быть пустой строки)';
