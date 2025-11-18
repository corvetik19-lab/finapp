-- Миграция: Создание таблицы комментариев к задачам
-- Дата: 2025-11-15
-- Описание: Таблица для хранения комментариев к задачам тендеров

-- Создаём таблицу комментариев
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tender_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id, created_at DESC);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);

-- Включаем RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Политики RLS
-- SELECT: Пользователи могут видеть комментарии к задачам своей компании
CREATE POLICY "Users can view comments in their company tasks"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tender_tasks tt
      JOIN company_members cm ON cm.company_id = tt.company_id
      WHERE tt.id = task_comments.task_id
      AND cm.user_id = auth.uid()
    )
  );

-- INSERT: Пользователи могут добавлять комментарии к задачам своей компании
CREATE POLICY "Users can add comments to their company tasks"
  ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tender_tasks tt
      JOIN company_members cm ON cm.company_id = tt.company_id
      WHERE tt.id = task_comments.task_id
      AND cm.user_id = auth.uid()
    )
  );

-- UPDATE: Пользователи могут редактировать только свои комментарии
CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Пользователи могут удалять только свои комментарии
CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_updated_at();

-- Комментарии
COMMENT ON TABLE task_comments IS 'Комментарии к задачам тендеров';
COMMENT ON COLUMN task_comments.task_id IS 'ID задачи';
COMMENT ON COLUMN task_comments.user_id IS 'ID пользователя, оставившего комментарий';
COMMENT ON COLUMN task_comments.comment IS 'Текст комментария';
