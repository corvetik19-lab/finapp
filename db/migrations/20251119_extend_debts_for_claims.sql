-- Расширение таблицы debts для системы взыскания долгов (претензионная работа)
-- Добавляем поля для связи с тендерами и этапы работы как в CRM

-- Добавляем новые колонки
ALTER TABLE debts ADD COLUMN IF NOT EXISTS tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS application_number TEXT; -- Номер заявки
ALTER TABLE debts ADD COLUMN IF NOT EXISTS contract_number TEXT; -- Номер договора
ALTER TABLE debts ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new' 
  CHECK (stage IN ('new', 'claim', 'court', 'writ', 'bailiff', 'paid'));
ALTER TABLE debts ADD COLUMN IF NOT EXISTS plaintiff TEXT; -- Истец (наша организация)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS defendant TEXT; -- Ответчик (должник)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS comments TEXT; -- Комментарии

-- Обновляем существующие записи: устанавливаем stage на основе status
UPDATE debts 
SET stage = CASE 
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'partially_paid' THEN 'claim'
  ELSE 'new'
END
WHERE stage = 'new';

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_debts_tender_id ON debts(tender_id);
CREATE INDEX IF NOT EXISTS idx_debts_stage ON debts(stage);
CREATE INDEX IF NOT EXISTS idx_debts_application_number ON debts(application_number);

-- Комментарии
COMMENT ON COLUMN debts.tender_id IS 'Связь с тендером (опционально)';
COMMENT ON COLUMN debts.application_number IS 'Номер заявки на участие в тендере';
COMMENT ON COLUMN debts.contract_number IS 'Номер договора';
COMMENT ON COLUMN debts.stage IS 'Этап взыскания: new (новые), claim (претензия), court (суд), writ (исполнительный лист), bailiff (приставы), paid (оплачено)';
COMMENT ON COLUMN debts.plaintiff IS 'Истец (наша организация)';
COMMENT ON COLUMN debts.defendant IS 'Ответчик (должник)';
COMMENT ON COLUMN debts.comments IS 'Комментарии по претензии';
