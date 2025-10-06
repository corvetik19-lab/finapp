-- Миграция: Типы планов, пресеты и обновление таблицы plans
-- Дата: 2025-10-03

-- 1. Создание таблицы типов планов (настраиваемые пользователем)
CREATE TABLE IF NOT EXISTS plan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'savings',
  color TEXT DEFAULT '#1565C0',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- RLS для plan_types
ALTER TABLE plan_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan types"
  ON plan_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan types"
  ON plan_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan types"
  ON plan_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan types"
  ON plan_types FOR DELETE
  USING (auth.uid() = user_id);

-- Индексы для plan_types
CREATE INDEX idx_plan_types_user_id ON plan_types(user_id);
CREATE INDEX idx_plan_types_sort_order ON plan_types(user_id, sort_order);

-- 2. Создание таблицы пресетов планов
CREATE TABLE IF NOT EXISTS plan_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan_type_id UUID REFERENCES plan_types(id) ON DELETE SET NULL,
  goal_amount BIGINT,
  monthly_contribution BIGINT,
  priority TEXT CHECK (priority IN ('Высокий', 'Средний', 'Низкий')) DEFAULT 'Средний',
  note TEXT,
  icon TEXT DEFAULT 'flag',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- RLS для plan_presets
ALTER TABLE plan_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan presets"
  ON plan_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan presets"
  ON plan_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan presets"
  ON plan_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan presets"
  ON plan_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Индексы для plan_presets
CREATE INDEX idx_plan_presets_user_id ON plan_presets(user_id);
CREATE INDEX idx_plan_presets_type_id ON plan_presets(plan_type_id);

-- 3. Обновление/создание таблицы plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  plan_type_id UUID REFERENCES plan_types(id) ON DELETE SET NULL,
  goal_amount BIGINT NOT NULL DEFAULT 0,
  current_amount BIGINT NOT NULL DEFAULT 0,
  monthly_contribution BIGINT DEFAULT 0,
  target_date DATE,
  priority TEXT CHECK (priority IN ('Высокий', 'Средний', 'Низкий')) DEFAULT 'Средний',
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[],
  note TEXT,
  links TEXT[],
  currency TEXT DEFAULT 'RUB',
  status TEXT CHECK (status IN ('active', 'ahead', 'behind', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Обновление существующей таблицы plans, если она была создана ранее
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS plan_type_id UUID REFERENCES plan_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal_amount BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_amount BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_contribution BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Высокий', 'Средний', 'Низкий')) DEFAULT 'Средний',
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS links TEXT[],
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'ahead', 'behind', 'completed', 'paused')) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- RLS для plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- Индексы для plans
CREATE INDEX idx_plans_user_id ON plans(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_status ON plans(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_target_date ON plans(user_id, target_date) WHERE deleted_at IS NULL;

-- 4. Создание таблицы взносов в планы (plan_topups)
CREATE TABLE IF NOT EXISTS plan_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT CHECK (type IN ('topup', 'withdrawal')) DEFAULT 'topup',
  description TEXT,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для plan_topups
ALTER TABLE plan_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own plan topups"
  ON plan_topups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan topups"
  ON plan_topups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan topups"
  ON plan_topups FOR DELETE
  USING (auth.uid() = user_id);

-- Индексы для plan_topups
CREATE INDEX idx_plan_topups_plan_id ON plan_topups(plan_id);
CREATE INDEX idx_plan_topups_user_id ON plan_topups(user_id);
CREATE INDEX idx_plan_topups_date ON plan_topups(plan_id, date DESC);

-- 5. Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_types_updated_at
  BEFORE UPDATE ON plan_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_presets_updated_at
  BEFORE UPDATE ON plan_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_topups_updated_at
  BEFORE UPDATE ON plan_topups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Функция для автоматического обновления current_amount в планах
CREATE OR REPLACE FUNCTION update_plan_current_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'topup' THEN
      UPDATE plans SET current_amount = current_amount + NEW.amount WHERE id = NEW.plan_id;
    ELSE
      UPDATE plans SET current_amount = current_amount - NEW.amount WHERE id = NEW.plan_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.type = 'topup' THEN
      UPDATE plans SET current_amount = current_amount - OLD.amount WHERE id = OLD.plan_id;
    ELSE
      UPDATE plans SET current_amount = current_amount + OLD.amount WHERE id = OLD.plan_id;
    END IF;
    IF NEW.type = 'topup' THEN
      UPDATE plans SET current_amount = current_amount + NEW.amount WHERE id = NEW.plan_id;
    ELSE
      UPDATE plans SET current_amount = current_amount - NEW.amount WHERE id = NEW.plan_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'topup' THEN
      UPDATE plans SET current_amount = current_amount - OLD.amount WHERE id = OLD.plan_id;
    ELSE
      UPDATE plans SET current_amount = current_amount + OLD.amount WHERE id = OLD.plan_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_current_amount
  AFTER INSERT OR UPDATE OR DELETE ON plan_topups
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_current_amount();

-- 7. Начальные типы планов (будут созданы автоматически для каждого пользователя)
-- Это будет делаться через код при регистрации или первом заходе

COMMENT ON TABLE plan_types IS 'Настраиваемые типы финансовых планов пользователя';
COMMENT ON TABLE plan_presets IS 'Шаблоны (пресеты) планов для быстрого создания';
COMMENT ON TABLE plans IS 'Финансовые планы и цели пользователя';
COMMENT ON TABLE plan_topups IS 'История взносов и снятий по планам';
