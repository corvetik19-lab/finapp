-- Миграция для модуля Фитнес
-- Создаёт таблицы для программ тренировок, упражнений и отслеживания прогресса

-- Программы тренировок
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT, -- например: "Набор массы", "Похудение", "Сила"
  duration_weeks INTEGER, -- длительность программы в неделях
  workouts_per_week INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Упражнения (библиотека)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- "Грудь", "Спина", "Ноги", "Плечи", "Руки", "Пресс", "Кардио"
  equipment TEXT, -- "Штанга", "Гантели", "Тренажёр", "Своё тело", "Кардио"
  video_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Тренировочные сессии (история тренировок)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES workout_programs(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  mood TEXT, -- "Отлично", "Хорошо", "Нормально", "Плохо"
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Подходы в упражнениях
CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER, -- количество повторений
  weight_kg DECIMAL(5,2), -- вес в кг
  duration_seconds INTEGER, -- для кардио или планки
  distance_meters INTEGER, -- для бега/ходьбы
  rest_seconds INTEGER, -- отдых после подхода
  completed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Замеры тела (прогресс)
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,2),
  body_fat_percent DECIMAL(4,2),
  chest_cm DECIMAL(5,2),
  waist_cm DECIMAL(5,2),
  hips_cm DECIMAL(5,2),
  biceps_cm DECIMAL(5,2),
  thighs_cm DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_workout_programs_user_id ON workout_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_is_active ON workout_programs(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(user_id, category);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_program ON workout_sessions(program_id);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_session ON exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise ON exercise_sets(exercise_id);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(user_id, measurement_date DESC);

-- Row Level Security (RLS)
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Политики RLS для workout_programs
CREATE POLICY "Users can view their own programs"
  ON workout_programs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own programs"
  ON workout_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own programs"
  ON workout_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own programs"
  ON workout_programs FOR DELETE
  USING (auth.uid() = user_id);

-- Политики RLS для exercises
CREATE POLICY "Users can view their own exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Политики RLS для workout_sessions
CREATE POLICY "Users can view their own sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Политики RLS для exercise_sets
CREATE POLICY "Users can view their own sets"
  ON exercise_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sets"
  ON exercise_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sets"
  ON exercise_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sets"
  ON exercise_sets FOR DELETE
  USING (auth.uid() = user_id);

-- Политики RLS для body_measurements
CREATE POLICY "Users can view their own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements"
  ON body_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workout_programs_updated_at
  BEFORE UPDATE ON workout_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
