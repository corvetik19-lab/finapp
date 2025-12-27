-- Миграция: Создание таблиц для пользовательских подписок (режим Финансы)
-- Дата: 2025-12-27

-- =====================================================
-- Таблица тарифных планов для пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'finance', -- для какого режима (finance, investments)
  price_monthly BIGINT NOT NULL DEFAULT 0, -- цена в копейках
  price_yearly BIGINT NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}', -- лимиты: transactions_limit, accounts_limit и т.д.
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Таблица подписок пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES user_subscription_plans(id),
  mode TEXT NOT NULL DEFAULT 'finance', -- режим подписки (finance, investments)
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  amount BIGINT NOT NULL DEFAULT 0, -- стоимость в копейках
  discount_percent INTEGER DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mode) -- один пользователь = одна подписка на режим
);

-- =====================================================
-- Таблица платежей пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  description TEXT,
  external_id VARCHAR(255), -- ID во внешней платёжной системе
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Таблица истории подписок пользователей
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- created, upgraded, downgraded, cancelled, renewed, expired
  old_plan_id UUID REFERENCES user_subscription_plans(id),
  new_plan_id UUID REFERENCES user_subscription_plans(id),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Индексы
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mode ON user_subscriptions(mode);
CREATE INDEX IF NOT EXISTS idx_user_subscription_payments_user_id ON user_subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_payments_subscription_id ON user_subscription_payments(subscription_id);

-- =====================================================
-- RLS политики
-- =====================================================

-- user_subscription_plans: все могут читать активные планы
ALTER TABLE user_subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON user_subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admin full access to plans" ON user_subscription_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

-- user_subscriptions: пользователь видит свои, super_admin видит все
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admin full access to subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

-- user_subscription_payments: пользователь видит свои, super_admin видит все
ALTER TABLE user_subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON user_subscription_payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admin full access to payments" ON user_subscription_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

-- user_subscription_history: пользователь видит свою историю, super_admin видит все
ALTER TABLE user_subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON user_subscription_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_subscriptions WHERE id = subscription_id AND user_id = auth.uid())
  );

CREATE POLICY "Super admin full access to history" ON user_subscription_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

-- =====================================================
-- Начальные данные: тарифные планы для режима Финансы
-- =====================================================
INSERT INTO user_subscription_plans (name, description, mode, price_monthly, price_yearly, features, limits, is_active, is_default, sort_order)
VALUES 
  ('Бесплатный', 'Базовые функции для личных финансов', 'finance', 0, 0, 
   '{"reports": false, "ai_features": false, "export": false}'::jsonb,
   '{"transactions_limit": 100, "accounts_limit": 3, "categories_limit": 20}'::jsonb,
   true, true, 1),
  ('Стандарт', 'Расширенные возможности для активных пользователей', 'finance', 29900, 299000, 
   '{"reports": true, "ai_features": false, "export": true}'::jsonb,
   '{"transactions_limit": 1000, "accounts_limit": 10, "categories_limit": 50}'::jsonb,
   true, false, 2),
  ('Премиум', 'Полный доступ ко всем функциям', 'finance', 49900, 499000, 
   '{"reports": true, "ai_features": true, "export": true, "priority_support": true}'::jsonb,
   '{"transactions_limit": -1, "accounts_limit": -1, "categories_limit": -1}'::jsonb,
   true, false, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Комментарии к таблицам
-- =====================================================
COMMENT ON TABLE user_subscription_plans IS 'Тарифные планы для индивидуальных пользователей (режим Финансы, Инвестиции)';
COMMENT ON TABLE user_subscriptions IS 'Подписки индивидуальных пользователей на режимы (Финансы, Инвестиции)';
COMMENT ON TABLE user_subscription_payments IS 'Платежи по подпискам индивидуальных пользователей';
COMMENT ON TABLE user_subscription_history IS 'История изменений подписок индивидуальных пользователей';
