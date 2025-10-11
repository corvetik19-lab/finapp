-- Onboarding Progress
-- Отслеживание прогресса онбординга пользователей

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 0,
  steps_completed TEXT[] DEFAULT ARRAY[]::TEXT[],
  skipped BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding progress"
ON onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
ON onboarding_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
ON onboarding_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Индексы
CREATE INDEX idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_completed ON onboarding_progress(completed);

-- Комментарии
COMMENT ON TABLE onboarding_progress IS 'Прогресс онбординга пользователей';
COMMENT ON COLUMN onboarding_progress.steps_completed IS 'Список завершённых шагов';
COMMENT ON COLUMN onboarding_progress.skipped IS 'Пользователь пропустил онбординг';
