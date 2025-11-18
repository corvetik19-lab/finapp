-- ============================================================
-- Миграция: Добавление поля is_active в tender_stages
-- Дата: 2025-11-14
-- Описание: Добавление флага активности этапов
-- ============================================================

-- Добавляем колонку is_active
ALTER TABLE tender_stages 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Устанавливаем все существующие этапы как активные
UPDATE tender_stages 
SET is_active = true 
WHERE is_active IS NULL;

-- Добавляем индекс для быстрого поиска активных этапов
CREATE INDEX IF NOT EXISTS idx_tender_stages_active 
ON tender_stages(is_active) 
WHERE is_active = true;

-- Комментарий
COMMENT ON COLUMN tender_stages.is_active IS 'Флаг активности этапа (активные этапы отображаются в интерфейсе)';
