-- Добавляем недостающие поля в существующую таблицу tender_comments
ALTER TABLE tender_comments 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS comment_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES tender_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_name text;

-- Заполняем company_id для существующих записей
UPDATE tender_comments 
SET company_id = (
  SELECT company_id FROM tenders WHERE tenders.id = tender_comments.tender_id
)
WHERE company_id IS NULL;

-- Создание таблицы вложений к комментариям
CREATE TABLE IF NOT EXISTS tender_comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES tender_comments(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  file_path text NOT NULL, -- путь в Supabase Storage
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tender_comments_tender_id ON tender_comments(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_comments_author_id ON tender_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_tender_comments_company_id ON tender_comments(company_id);
CREATE INDEX IF NOT EXISTS idx_tender_comments_type ON tender_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_tender_comment_attachments_comment_id ON tender_comment_attachments(comment_id);

-- RLS политики
ALTER TABLE tender_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_comment_attachments ENABLE ROW LEVEL SECURITY;

-- Политики для tender_comments
CREATE POLICY "Users can view comments from their company"
  ON tender_comments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments for their company tenders"
  ON tender_comments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
    AND tender_id IN (
      SELECT id FROM tenders WHERE company_id = tender_comments.company_id
    )
  );

CREATE POLICY "Users can update their own comments"
  ON tender_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON tender_comments FOR DELETE
  USING (author_id = auth.uid());

-- Политики для tender_comment_attachments
CREATE POLICY "Users can view attachments from their company comments"
  ON tender_comment_attachments FOR SELECT
  USING (
    comment_id IN (
      SELECT id FROM tender_comments
      WHERE company_id IN (
        SELECT company_id FROM employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create attachments for their comments"
  ON tender_comment_attachments FOR INSERT
  WITH CHECK (
    comment_id IN (
      SELECT id FROM tender_comments WHERE author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments from their comments"
  ON tender_comment_attachments FOR DELETE
  USING (
    comment_id IN (
      SELECT id FROM tender_comments WHERE author_id = auth.uid()
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_tender_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tender_comments_updated_at
  BEFORE UPDATE ON tender_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_comment_updated_at();
