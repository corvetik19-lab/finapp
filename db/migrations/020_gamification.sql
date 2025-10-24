-- ============================================================================
-- Миграция: Геймификация (достижения, стрики, бейджи)
-- Версия: 020
-- Дата: 2025-10-19
-- ============================================================================

-- Таблица: Определения достижений (achievements_definitions)
-- Хранит все возможные достижения в системе
CREATE TABLE IF NOT EXISTS achievements_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji или иконка
  category TEXT NOT NULL, -- 'transactions', 'savings', 'streaks', 'budgets', 'special'
  tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  points INTEGER NOT NULL DEFAULT 10, -- Очки за достижение
  requirement_type TEXT NOT NULL, -- 'count', 'amount', 'streak', 'custom'
  requirement_value INTEGER, -- Необходимое значение (если применимо)
  is_hidden BOOLEAN DEFAULT FALSE, -- Скрытое достижение (сюрприз)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по категориям
CREATE INDEX IF NOT EXISTS idx_achievements_definitions_category 
ON achievements_definitions(category);

-- Таблица: Пользовательские достижения (user_achievements)
-- Какие достижения разблокированы у пользователя
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- Текущий прогресс (для частично выполненных)
  is_notified BOOLEAN DEFAULT FALSE, -- Показали ли уведомление
  
  UNIQUE(user_id, achievement_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at 
ON user_achievements(unlocked_at DESC);

-- RLS для user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

-- Таблица: Стрики (activity_streaks)
-- Отслеживание активности пользователя
CREATE TABLE IF NOT EXISTS activity_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- 'daily_login', 'daily_transaction', 'budget_check'
  current_streak INTEGER DEFAULT 0, -- Текущий стрик
  longest_streak INTEGER DEFAULT 0, -- Рекордный стрик
  last_activity_date DATE, -- Последняя активность
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, streak_type)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_activity_streaks_user_id 
ON activity_streaks(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_streaks_last_activity 
ON activity_streaks(user_id, last_activity_date DESC);

-- RLS для activity_streaks
ALTER TABLE activity_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON activity_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" ON activity_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON activity_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Таблица: Уровни пользователя (user_levels)
-- Система уровней и опыта
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0, -- XP
  total_achievements INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_days_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id 
ON user_levels(user_id);

-- RLS для user_levels
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own level" ON user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own level" ON user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own level" ON user_levels
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- Функция: Обновление уровня при изменении XP
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Формула: level = floor(sqrt(xp / 100)) + 1
  -- 0-99 XP = level 1
  -- 100-399 XP = level 2
  -- 400-899 XP = level 3
  -- и т.д.
  RETURN FLOOR(SQRT(xp / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := calculate_level_from_xp(NEW.experience_points);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF experience_points ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- ============================================================================
-- Начальные данные: Определения достижений
-- ============================================================================

INSERT INTO achievements_definitions (id, name, description, icon, category, tier, points, requirement_type, requirement_value) VALUES
-- Транзакции
('first_transaction', 'Первый шаг', 'Добавьте первую транзакцию', '🎯', 'transactions', 'bronze', 10, 'count', 1),
('transactions_10', 'Новичок', '10 транзакций', '📝', 'transactions', 'bronze', 20, 'count', 10),
('transactions_50', 'Активный', '50 транзакций', '✍️', 'transactions', 'silver', 50, 'count', 50),
('transactions_100', 'Мастер учёта', '100 транзакций', '📊', 'transactions', 'gold', 100, 'count', 100),
('transactions_500', 'Легенда', '500 транзакций', '👑', 'transactions', 'platinum', 500, 'count', 500),

-- Накопления
('first_savings_goal', 'Цель поставлена', 'Создайте первую цель накоплений', '🎯', 'savings', 'bronze', 15, 'count', 1),
('goal_achieved', 'Мечта сбылась', 'Достигните цели накоплений', '🎉', 'savings', 'silver', 100, 'custom', NULL),
('saved_10k', 'Первая 10K', 'Накопите 10 000 ₽', '💰', 'savings', 'silver', 50, 'amount', 10000),
('saved_100k', 'Мастер накоплений', 'Накопите 100 000 ₽', '💎', 'savings', 'gold', 200, 'amount', 100000),

-- Стрики
('streak_7', 'Неделя активности', '7 дней подряд', '🔥', 'streaks', 'bronze', 30, 'streak', 7),
('streak_30', 'Месяц активности', '30 дней подряд', '⚡', 'streaks', 'silver', 100, 'streak', 30),
('streak_90', 'Квартал активности', '90 дней подряд', '🌟', 'streaks', 'gold', 300, 'streak', 90),
('streak_365', 'Год активности', '365 дней подряд', '👑', 'streaks', 'platinum', 1000, 'streak', 365),

-- Бюджеты
('first_budget', 'Первый бюджет', 'Создайте бюджет', '💼', 'budgets', 'bronze', 15, 'count', 1),
('budget_master', 'Мастер бюджетов', 'Соблюдайте бюджет 3 месяца подряд', '🎖️', 'budgets', 'gold', 150, 'custom', NULL),

-- Специальные
('early_bird', 'Ранняя пташка', 'Добавьте транзакцию до 8:00', '🌅', 'special', 'bronze', 10, 'custom', NULL),
('night_owl', 'Полуночник', 'Добавьте транзакцию после 23:00', '🦉', 'special', 'bronze', 10, 'custom', NULL),
('weekend_warrior', 'Выходной воин', 'Добавьте 10 транзакций в выходные', '🏖️', 'special', 'silver', 25, 'custom', NULL),
('perfectionist', 'Перфекционист', 'Заполните все поля транзакции 50 раз', '✨', 'special', 'gold', 100, 'custom', NULL)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Комментарии
-- ============================================================================

COMMENT ON TABLE achievements_definitions IS 'Определения всех достижений в системе';
COMMENT ON TABLE user_achievements IS 'Разблокированные достижения пользователей';
COMMENT ON TABLE activity_streaks IS 'Стрики активности пользователей';
COMMENT ON TABLE user_levels IS 'Уровни и опыт пользователей';

COMMENT ON COLUMN activity_streaks.streak_type IS 'Тип стрика: daily_login, daily_transaction, budget_check';
COMMENT ON COLUMN user_levels.experience_points IS 'Очки опыта (XP) для определения уровня';
