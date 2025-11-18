-- Добавляем поле для ответов на комментарии
ALTER TABLE tender_comments 
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES tender_comments(id) ON DELETE CASCADE;

-- Индекс для быстрого поиска ответов
CREATE INDEX IF NOT EXISTS idx_tender_comments_parent_id ON tender_comments(parent_comment_id);

-- Комментарий к полю
COMMENT ON COLUMN tender_comments.parent_comment_id IS 'ID родительского комментария, если это ответ';
