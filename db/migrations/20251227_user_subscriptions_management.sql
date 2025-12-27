-- Миграция: Добавление полей для управления подписками
-- Дата: 2025-12-27

-- Добавляем статус suspended
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Обновляем constraint для статуса если нужно
DO $$
BEGIN
  -- Удаляем старый constraint если есть
  ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
  
  -- Добавляем новый с suspended
  ALTER TABLE user_subscriptions 
  ADD CONSTRAINT user_subscriptions_status_check 
  CHECK (status IN ('active', 'trial', 'expired', 'cancelled', 'past_due', 'suspended'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Добавляем действие suspended в историю
DO $$
BEGIN
  ALTER TABLE user_subscription_history DROP CONSTRAINT IF EXISTS user_subscription_history_action_check;
  
  ALTER TABLE user_subscription_history 
  ADD CONSTRAINT user_subscription_history_action_check 
  CHECK (action IN ('created', 'updated', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'expired', 'suspended', 'resumed', 'deleted'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Создаём таблицу ролей для режима Финансы (если ещё нет)
CREATE TABLE IF NOT EXISTS finance_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  level int NOT NULL DEFAULT 0, -- 0=free, 1=standard, 2=premium
  permissions jsonb DEFAULT '{}',
  features jsonb DEFAULT '[]', -- доступные функции
  limits jsonb DEFAULT '{}', -- лимиты (количество счетов, транзакций и т.д.)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем роль в подписку пользователя
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS finance_role_id uuid REFERENCES finance_roles(id);

-- Создаём базовые роли для Финансов
INSERT INTO finance_roles (name, display_name, description, level, permissions, features, limits)
VALUES 
  ('finance_free', 'Бесплатный', 'Базовый доступ к финансам', 0, 
   '{"view_dashboard": true, "create_transactions": true, "view_reports": false, "export_data": false, "ai_assistant": false}',
   '["dashboard", "transactions", "accounts"]',
   '{"max_accounts": 2, "max_transactions_per_month": 50, "max_categories": 10}'),
  
  ('finance_standard', 'Стандарт', 'Расширенный доступ к финансам', 1,
   '{"view_dashboard": true, "create_transactions": true, "view_reports": true, "export_data": true, "ai_assistant": false, "budgets": true, "recurring": true}',
   '["dashboard", "transactions", "accounts", "budgets", "reports", "export", "recurring_payments"]',
   '{"max_accounts": 10, "max_transactions_per_month": 500, "max_categories": 50, "max_budgets": 10}'),
  
  ('finance_premium', 'Премиум', 'Полный доступ ко всем функциям финансов', 2,
   '{"view_dashboard": true, "create_transactions": true, "view_reports": true, "export_data": true, "ai_assistant": true, "budgets": true, "recurring": true, "investments": true, "goals": true, "multi_currency": true}',
   '["dashboard", "transactions", "accounts", "budgets", "reports", "export", "recurring_payments", "ai_chat", "investments", "goals", "analytics", "multi_currency"]',
   '{"max_accounts": -1, "max_transactions_per_month": -1, "max_categories": -1, "max_budgets": -1}')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  permissions = EXCLUDED.permissions,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();

-- Связываем тарифы с ролями
UPDATE user_subscription_plans 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{finance_role}', 
  '"finance_free"'
)
WHERE name = 'Бесплатный' OR price_monthly = 0;

UPDATE user_subscription_plans 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{finance_role}', 
  '"finance_standard"'
)
WHERE name = 'Стандарт' OR (price_monthly > 0 AND price_monthly < 40000);

UPDATE user_subscription_plans 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{finance_role}', 
  '"finance_premium"'
)
WHERE name = 'Премиум' OR price_monthly >= 40000;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_suspended ON user_subscriptions(suspended_at) WHERE suspended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_roles_level ON finance_roles(level);
