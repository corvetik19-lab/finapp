-- Kie.ai Tasks History Table
-- Хранение истории задач генерации для пользователей

CREATE TABLE IF NOT EXISTS kie_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  model_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('image', 'video', 'audio')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'queuing', 'generating', 'success', 'fail')),
  input JSONB NOT NULL DEFAULT '{}',
  result_urls TEXT[] DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kie_tasks_user_id ON kie_tasks(user_id);
CREATE INDEX idx_kie_tasks_status ON kie_tasks(status);
CREATE INDEX idx_kie_tasks_category ON kie_tasks(category);
CREATE INDEX idx_kie_tasks_created_at ON kie_tasks(created_at DESC);

-- RLS Policies
ALTER TABLE kie_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users can view own kie_tasks"
  ON kie_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own kie_tasks"
  ON kie_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own kie_tasks"
  ON kie_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own kie_tasks"
  ON kie_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kie_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kie_tasks_updated_at
  BEFORE UPDATE ON kie_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_kie_tasks_updated_at();

-- Comment
COMMENT ON TABLE kie_tasks IS 'История задач генерации Kie.ai для пользователей';
