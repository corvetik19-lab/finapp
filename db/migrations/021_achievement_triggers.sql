-- ============================================================================
-- Миграция: Автоматическая проверка достижений (триггеры)
-- Версия: 021
-- Дата: 2025-10-20
-- ============================================================================

-- ============================================================================
-- Функция: Проверка и разблокировка достижения по количеству
-- ============================================================================

CREATE OR REPLACE FUNCTION check_count_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_current_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_requirement INTEGER;
  v_already_unlocked BOOLEAN;
BEGIN
  -- Получаем требование для достижения
  SELECT requirement_value INTO v_requirement
  FROM achievements_definitions
  WHERE id = p_achievement_id;
  
  -- Проверяем не разблокировано ли уже
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_already_unlocked;
  
  -- Если уже разблокировано, ничего не делаем
  IF v_already_unlocked THEN
    RETURN FALSE;
  END IF;
  
  -- Если достигли требования, разблокируем
  IF p_current_count >= v_requirement THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (p_user_id, p_achievement_id, p_current_count)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    RETURN TRUE;
  ELSE
    -- Обновляем прогресс
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (p_user_id, p_achievement_id, p_current_count)
    ON CONFLICT (user_id, achievement_id) 
    DO UPDATE SET progress = p_current_count;
    
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Функция: Добавление XP пользователю
-- ============================================================================

CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Создаём или обновляем запись уровня
  INSERT INTO user_levels (user_id, experience_points, updated_at)
  VALUES (p_user_id, p_xp_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    experience_points = user_levels.experience_points + p_xp_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Функция: Проверка достижений по транзакциям
-- ============================================================================

CREATE OR REPLACE FUNCTION check_transaction_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_count INTEGER;
  v_unlocked BOOLEAN;
  v_achievement_points INTEGER;
  v_hour INTEGER;
  v_day_of_week INTEGER;
BEGIN
  -- Считаем количество транзакций пользователя
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions
  WHERE user_id = NEW.user_id;
  
  -- Проверяем достижения по количеству транзакций
  -- first_transaction (1)
  v_unlocked := check_count_achievement(NEW.user_id, 'first_transaction', v_transaction_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 10);
  END IF;
  
  -- transactions_10 (10)
  v_unlocked := check_count_achievement(NEW.user_id, 'transactions_10', v_transaction_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 20);
  END IF;
  
  -- transactions_50 (50)
  v_unlocked := check_count_achievement(NEW.user_id, 'transactions_50', v_transaction_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 50);
  END IF;
  
  -- transactions_100 (100)
  v_unlocked := check_count_achievement(NEW.user_id, 'transactions_100', v_transaction_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 100);
  END IF;
  
  -- transactions_500 (500)
  v_unlocked := check_count_achievement(NEW.user_id, 'transactions_500', v_transaction_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 500);
  END IF;
  
  -- Проверяем специальные достижения
  
  -- early_bird (до 8:00)
  v_hour := EXTRACT(HOUR FROM NEW.occurred_at AT TIME ZONE 'UTC');
  IF v_hour < 8 THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, 'early_bird', 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Добавляем XP если разблокировали
    IF FOUND THEN
      PERFORM add_user_xp(NEW.user_id, 10);
    END IF;
  END IF;
  
  -- night_owl (после 23:00)
  IF v_hour >= 23 THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, 'night_owl', 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    IF FOUND THEN
      PERFORM add_user_xp(NEW.user_id, 10);
    END IF;
  END IF;
  
  -- Обновляем счётчик транзакций в user_levels
  UPDATE user_levels
  SET total_transactions = v_transaction_count
  WHERE user_id = NEW.user_id;
  
  -- Даём небольшой XP за любую транзакцию
  PERFORM add_user_xp(NEW.user_id, 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Триггер: Проверка достижений при создании транзакции
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_check_transaction_achievements ON transactions;
CREATE TRIGGER trigger_check_transaction_achievements
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_transaction_achievements();

-- ============================================================================
-- Функция: Проверка достижений по бюджетам
-- ============================================================================

CREATE OR REPLACE FUNCTION check_budget_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_count INTEGER;
  v_unlocked BOOLEAN;
BEGIN
  -- Считаем количество бюджетов пользователя
  SELECT COUNT(*) INTO v_budget_count
  FROM budgets
  WHERE user_id = NEW.user_id;
  
  -- first_budget (1)
  v_unlocked := check_count_achievement(NEW.user_id, 'first_budget', v_budget_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 15);
  END IF;
  
  -- Даём XP за создание бюджета
  PERFORM add_user_xp(NEW.user_id, 5);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Триггер: Проверка достижений при создании бюджета
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_check_budget_achievements ON budgets;
CREATE TRIGGER trigger_check_budget_achievements
  AFTER INSERT ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_achievements();

-- ============================================================================
-- Функция: Проверка достижений по планам (целям накопления)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_plan_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_count INTEGER;
  v_unlocked BOOLEAN;
BEGIN
  -- Считаем количество планов пользователя
  SELECT COUNT(*) INTO v_plan_count
  FROM plans
  WHERE user_id = NEW.user_id;
  
  -- first_savings_goal (1)
  v_unlocked := check_count_achievement(NEW.user_id, 'first_savings_goal', v_plan_count);
  IF v_unlocked THEN
    PERFORM add_user_xp(NEW.user_id, 15);
  END IF;
  
  -- Даём XP за создание плана
  PERFORM add_user_xp(NEW.user_id, 5);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Триггер: Проверка достижений при создании плана
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_check_plan_achievements ON plans;
CREATE TRIGGER trigger_check_plan_achievements
  AFTER INSERT ON plans
  FOR EACH ROW
  EXECUTE FUNCTION check_plan_achievements();

-- ============================================================================
-- Функция: Проверка достижения цели накопления
-- ============================================================================

CREATE OR REPLACE FUNCTION check_goal_achieved()
RETURNS TRIGGER AS $$
BEGIN
  -- Если план выполнен (accumulated >= target)
  IF NEW.accumulated >= NEW.target AND (OLD.accumulated IS NULL OR OLD.accumulated < OLD.target) THEN
    -- Разблокируем goal_achieved
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, 'goal_achieved', 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Добавляем XP
    IF FOUND THEN
      PERFORM add_user_xp(NEW.user_id, 100);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Триггер: Проверка достижения цели при обновлении плана
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_check_goal_achieved ON plans;
CREATE TRIGGER trigger_check_goal_achieved
  AFTER UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION check_goal_achieved();

-- ============================================================================
-- Функция: Обновление стрика ежедневной активности
-- ============================================================================

CREATE OR REPLACE FUNCTION update_daily_streak(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Получаем текущий стрик
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM activity_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- Если записи нет, создаём
  IF NOT FOUND THEN
    INSERT INTO activity_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, p_streak_type, 1, 1, v_today);
    
    -- Даём XP за начало стрика
    PERFORM add_user_xp(p_user_id, 2);
    RETURN;
  END IF;
  
  -- Если уже была активность сегодня, ничего не делаем
  IF v_last_date = v_today THEN
    RETURN;
  END IF;
  
  -- Если вчера была активность, увеличиваем стрик
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    
    -- Обновляем рекорд если нужно
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    -- Даём XP за продолжение стрика
    PERFORM add_user_xp(p_user_id, 2);
    
    -- Проверяем достижения по стрикам
    IF v_current_streak >= 7 THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, 'streak_7', v_current_streak)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      IF FOUND THEN
        PERFORM add_user_xp(p_user_id, 30);
      END IF;
    END IF;
    
    IF v_current_streak >= 30 THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, 'streak_30', v_current_streak)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      IF FOUND THEN
        PERFORM add_user_xp(p_user_id, 100);
      END IF;
    END IF;
    
    IF v_current_streak >= 90 THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, 'streak_90', v_current_streak)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      IF FOUND THEN
        PERFORM add_user_xp(p_user_id, 300);
      END IF;
    END IF;
    
    IF v_current_streak >= 365 THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, 'streak_365', v_current_streak)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      IF FOUND THEN
        PERFORM add_user_xp(p_user_id, 1000);
      END IF;
    END IF;
  ELSE
    -- Стрик прервался, начинаем заново
    v_current_streak := 1;
  END IF;
  
  -- Обновляем стрик
  UPDATE activity_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    updated_at = NOW()
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- Обновляем total_days_active в user_levels
  UPDATE user_levels
  SET total_days_active = (
    SELECT SUM(longest_streak) 
    FROM activity_streaks 
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Функция: Обновление стрика при транзакции
-- ============================================================================

CREATE OR REPLACE FUNCTION update_transaction_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_daily_streak(NEW.user_id, 'daily_transaction');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Триггер: Обновление стрика при транзакции
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_transaction_streak ON transactions;
CREATE TRIGGER trigger_update_transaction_streak
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_streak();

-- ============================================================================
-- Комментарии
-- ============================================================================

COMMENT ON FUNCTION check_count_achievement IS 'Проверяет и разблокирует достижения по количеству';
COMMENT ON FUNCTION add_user_xp IS 'Добавляет XP пользователю';
COMMENT ON FUNCTION check_transaction_achievements IS 'Проверяет достижения при создании транзакции';
COMMENT ON FUNCTION check_budget_achievements IS 'Проверяет достижения при создании бюджета';
COMMENT ON FUNCTION check_plan_achievements IS 'Проверяет достижения при создании плана';
COMMENT ON FUNCTION check_goal_achieved IS 'Проверяет достижение цели накопления';
COMMENT ON FUNCTION update_daily_streak IS 'Обновляет ежедневный стрик активности';
