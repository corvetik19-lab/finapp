-- Добавление поля category в tender_attachments для категоризации файлов
-- Категории: tender (файлы тендера), calculation (просчет), submission (на подачу), contract (контракт)

-- Добавляем поле category
ALTER TABLE tender_attachments 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'tender' 
CHECK (category IN ('tender', 'calculation', 'submission', 'contract'));

-- Добавляем поле comment для комментариев к файлам
ALTER TABLE tender_attachments 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Обновляем существующие записи (если есть)
UPDATE tender_attachments 
SET category = 'tender' 
WHERE category IS NULL;

-- Создаём индекс для быстрого поиска по категории
CREATE INDEX IF NOT EXISTS idx_tender_attachments_category 
ON tender_attachments(tender_id, category);
