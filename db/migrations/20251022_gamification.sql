-- Миграция: Геймификация (достижения, стрики, уровни)
-- Дата: 2025-10-22
-- Описание: Система достижений, стриков и уровней для мотивации пользователей

-- Таблица: achievements (шаблоны достижений)
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- уникальный код (first_transaction, budget_master, etc.)
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL, -- эмодзи или иконка
  category text NOT NULL, -- transactions, budgets, savings, ai, streak
  requirement_type text NOT NULL, -- count, amount, streak, specific
  requirement_value integer, -- количество для выполнения
  points integer DEFAULT 10, -- XP points за достижение
  rarity text DEFAULT 'common', -- common, rare, epic, legendary
  created_at timestamptz DEFAULT now()
);

-- Таблица: user_achievements (достижения пользователей)
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  progress integer DEFAULT 0, -- текущий прогресс (для частичного выполнения)
  UNIQUE(user_id, achievement_id)
);

-- Таблица: user_streaks (стрики пользователей)
CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0, -- текущий стрик (дни подряд)
  longest_streak integer DEFAULT 0, -- максимальный стрик
  last_activity_date date, -- дата последней активности
  total_active_days integer DEFAULT 0, -- всего активных дней
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица: user_levels (уровни пользователей)
CREATE TABLE IF NOT EXISTS user_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer DEFAULT 1,
  xp integer DEFAULT 0, -- опыт
  xp_to_next_level integer DEFAULT 100, -- опыт до следующего уровня
  total_xp integer DEFAULT 0, -- всего заработано опыта
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица: challenges (челленджи)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  challenge_type text NOT NULL, -- daily, weekly, monthly
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  reward_xp integer DEFAULT 50,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Таблица: user_challenges (прогресс челленджей)
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active) WHERE is_active = true;

-- RLS политики
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Политики для achievements (все могут читать)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- Политики для user_achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Политики для user_streaks
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Политики для user_levels
CREATE POLICY "Users can view their own levels"
  ON user_levels FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own levels"
  ON user_levels FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own levels"
  ON user_levels FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Политики для challenges (все могут читать)
CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (true);

-- Политики для user_challenges
CREATE POLICY "Users can view their own challenge progress"
  ON user_challenges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own challenge progress"
  ON user_challenges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own challenge progress"
  ON user_challenges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Функция: Расчёт XP для следующего уровня
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level integer)
RETURNS integer AS $$
BEGIN
  -- Формула: 100 * level^1.5 (экспоненциальный рост)
  RETURN FLOOR(100 * POWER(level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Функция: Обновление уровня при получении XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level integer;
  xp_needed integer;
BEGIN
  -- Проверяем, достаточно ли XP для повышения уровня
  WHILE NEW.xp >= NEW.xp_to_next_level LOOP
    NEW.xp := NEW.xp - NEW.xp_to_next_level;
    NEW.level := NEW.level + 1;
    NEW.xp_to_next_level := calculate_xp_for_level(NEW.level);
  END LOOP;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер: Автоматическое повышение уровня
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF xp ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- Сиды: Базовые достижения
INSERT INTO achievements (code, title, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
  -- Транзакции
  ('first_transaction', 'Первый шаг', 'Добавьте первую транзакцию', '🎯', 'transactions', 'count', 1, 10, 'common'),
  ('transactions_10', 'Активный пользователь', 'Добавьте 10 транзакций', '📝', 'transactions', 'count', 10, 25, 'common'),
  ('transactions_50', 'Дисциплинированный', 'Добавьте 50 транзакций', '📊', 'transactions', 'count', 50, 50, 'rare'),
  ('transactions_100', 'Мастер учёта', 'Добавьте 100 транзакций', '🏆', 'transactions', 'count', 100, 100, 'epic'),
  ('transactions_500', 'Легенда финансов', 'Добавьте 500 транзакций', '👑', 'transactions', 'count', 500, 250, 'legendary'),
  
  -- Бюджеты
  ('first_budget', 'Планировщик', 'Создайте первый бюджет', '🎯', 'budgets', 'count', 1, 15, 'common'),
  ('budget_keeper', 'Бюджетный контроль', 'Не превысьте бюджет в течение месяца', '✅', 'budgets', 'specific', 1, 50, 'rare'),
  ('budget_master', 'Мастер бюджетов', 'Создайте 5 бюджетов', '💎', 'budgets', 'count', 5, 75, 'epic'),
  
  -- Накопления
  ('first_goal', 'Мечтатель', 'Создайте первую финансовую цель', '🌟', 'savings', 'count', 1, 15, 'common'),
  ('goal_achieved', 'Достигатор', 'Достигните финансовой цели', '🎉', 'savings', 'specific', 1, 100, 'epic'),
  ('saver_1000', 'Копилка', 'Накопите 1000₽', '🐷', 'savings', 'amount', 100000, 50, 'rare'),
  
  -- AI
  ('ai_first_chat', 'AI Новичок', 'Задайте первый вопрос AI помощнику', '🤖', 'ai', 'count', 1, 20, 'common'),
  ('ai_categorization', 'Умный учёт', 'Используйте AI автокатегоризацию', '🧠', 'ai', 'specific', 1, 30, 'rare'),
  
  -- Стрики
  ('streak_7', 'Неделя подряд', 'Добавляйте транзакции 7 дней подряд', '🔥', 'streak', 'streak', 7, 50, 'rare'),
  ('streak_30', 'Месяц подряд', 'Добавляйте транзакции 30 дней подряд', '⚡', 'streak', 'streak', 30, 150, 'epic'),
  ('streak_100', 'Несгибаемый', 'Добавляйте транзакции 100 дней подряд', '💪', 'streak', 'streak', 100, 500, 'legendary')
ON CONFLICT (code) DO NOTHING;

-- Сиды: Базовые челленджи
INSERT INTO challenges (code, title, description, icon, challenge_type, requirement_type, requirement_value, reward_xp, is_active) VALUES
  ('daily_transaction', 'Ежедневная запись', 'Добавьте хотя бы одну транзакцию сегодня', '📝', 'daily', 'count', 1, 10, true),
  ('weekly_budget_check', 'Проверка бюджета', 'Проверьте выполнение бюджетов на этой неделе', '🎯', 'weekly', 'specific', 1, 25, true),
  ('monthly_savings', 'Месячные накопления', 'Отложите деньги на цель в этом месяце', '💰', 'monthly', 'specific', 1, 50, true)
ON CONFLICT (code) DO NOTHING;
