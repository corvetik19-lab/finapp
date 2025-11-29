-- =====================================================
-- Система биллинга и подписок для организаций
-- =====================================================

-- 1. Тарифные планы подписок
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- Базовая стоимость плана (в копейках)
    base_price_monthly BIGINT NOT NULL DEFAULT 0,
    base_price_yearly BIGINT NOT NULL DEFAULT 0,
    -- Стоимость за дополнительного пользователя (в копейках)
    price_per_user_monthly BIGINT NOT NULL DEFAULT 0,
    price_per_user_yearly BIGINT NOT NULL DEFAULT 0,
    -- Количество пользователей, включённых в базовую стоимость
    users_included INTEGER NOT NULL DEFAULT 1,
    -- Максимальное количество пользователей (NULL = безлимит)
    max_users INTEGER,
    -- Доступные режимы/модули
    allowed_modes TEXT[] DEFAULT ARRAY['finance'],
    -- Дополнительные возможности (JSON)
    features JSONB DEFAULT '{}',
    -- Лимиты
    storage_limit_mb INTEGER DEFAULT 1024,
    -- Активность плана
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    -- Порядок сортировки
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Подписки организаций
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    -- Статус подписки
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    -- Период оплаты
    billing_period VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    -- Даты
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    -- Количество пользователей
    users_count INTEGER NOT NULL DEFAULT 1,
    -- Рассчитанные суммы (в копейках)
    base_amount BIGINT NOT NULL DEFAULT 0,
    users_amount BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    -- Скидка
    discount_percent INTEGER DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    -- Следующий платёж
    next_payment_amount BIGINT,
    next_payment_date TIMESTAMPTZ,
    -- Метаданные
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 3. История платежей
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Сумма платежа (в копейках)
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    -- Статус
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    -- Метод оплаты
    payment_method VARCHAR(50),
    -- Номер счёта/инвойса
    invoice_number VARCHAR(50),
    -- Период, за который платёж
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    -- Детализация
    description TEXT,
    details JSONB DEFAULT '{}',
    -- Даты
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. История изменений подписок (аудит)
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, upgraded, downgraded, renewed, cancelled, expired, reactivated
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Счета (инвойсы)
CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Номер счёта
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    -- Статус
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    -- Суммы
    subtotal BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'RUB',
    -- Период
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    -- Даты
    issue_date TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    -- Детали
    line_items JSONB DEFAULT '[]',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON organization_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization ON subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON subscription_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON subscription_invoices(status);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS organization_subscriptions_updated_at ON organization_subscriptions;
CREATE TRIGGER organization_subscriptions_updated_at
    BEFORE UPDATE ON organization_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS subscription_invoices_updated_at ON subscription_invoices;
CREATE TRIGGER subscription_invoices_updated_at
    BEFORE UPDATE ON subscription_invoices
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- =====================================================
-- Начальные данные: тарифные планы
-- =====================================================

INSERT INTO subscription_plans (name, description, base_price_monthly, base_price_yearly, price_per_user_monthly, price_per_user_yearly, users_included, max_users, allowed_modes, features, is_default, sort_order)
VALUES 
    -- Бесплатный план
    ('Бесплатный', 'Базовые функции для начала работы', 0, 0, 0, 0, 1, 1, ARRAY['finance'], 
     '{"transactions_limit": 100, "reports": false, "ai_features": false, "api_access": false}', 
     true, 1),
    
    -- Стартовый план
    ('Стартовый', 'Для небольших команд', 99000, 999000, 29900, 299000, 3, 10, ARRAY['finance', 'tenders'], 
     '{"transactions_limit": 1000, "reports": true, "ai_features": false, "api_access": false}', 
     false, 2),
    
    -- Бизнес план  
    ('Бизнес', 'Для растущих компаний', 299000, 2990000, 49900, 499000, 10, 50, ARRAY['finance', 'tenders', 'investments'], 
     '{"transactions_limit": -1, "reports": true, "ai_features": true, "api_access": true}', 
     false, 3),
    
    -- Энтерпрайз план
    ('Энтерпрайз', 'Для крупных организаций', 999000, 9990000, 79900, 799000, 50, NULL, ARRAY['finance', 'tenders', 'investments', 'personal'], 
     '{"transactions_limit": -1, "reports": true, "ai_features": true, "api_access": true, "dedicated_support": true, "custom_integrations": true}', 
     false, 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- RLS политики (только для супер-админа)
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Политики для subscription_plans (все могут читать, только супер-админ может менять)
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super admin full access to plans" ON subscription_plans;
CREATE POLICY "Super admin full access to plans" ON subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
    );

-- Политики для organization_subscriptions
DROP POLICY IF EXISTS "Org members can view own subscription" ON organization_subscriptions;
CREATE POLICY "Org members can view own subscription" ON organization_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            JOIN companies c ON c.id = cm.company_id
            WHERE c.organization_id = organization_subscriptions.organization_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Super admin full access to subscriptions" ON organization_subscriptions;
CREATE POLICY "Super admin full access to subscriptions" ON organization_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
    );

-- Политики для subscription_payments
DROP POLICY IF EXISTS "Org admins can view own payments" ON subscription_payments;
CREATE POLICY "Org admins can view own payments" ON subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            JOIN companies c ON c.id = cm.company_id
            WHERE c.organization_id = subscription_payments.organization_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Super admin full access to payments" ON subscription_payments;
CREATE POLICY "Super admin full access to payments" ON subscription_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
    );

-- Политики для subscription_history
DROP POLICY IF EXISTS "Super admin full access to history" ON subscription_history;
CREATE POLICY "Super admin full access to history" ON subscription_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
    );

-- Политики для subscription_invoices
DROP POLICY IF EXISTS "Org admins can view own invoices" ON subscription_invoices;
CREATE POLICY "Org admins can view own invoices" ON subscription_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            JOIN companies c ON c.id = cm.company_id
            WHERE c.organization_id = subscription_invoices.organization_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Super admin full access to invoices" ON subscription_invoices;
CREATE POLICY "Super admin full access to invoices" ON subscription_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
    );

-- =====================================================
-- Создаём подписку для существующей организации "Ромашка"
-- =====================================================

DO $$
DECLARE
    v_org_id UUID;
    v_free_plan_id UUID;
BEGIN
    -- Находим организацию
    SELECT id INTO v_org_id FROM organizations WHERE name = 'Ромашка' LIMIT 1;
    
    -- Находим бесплатный план
    SELECT id INTO v_free_plan_id FROM subscription_plans WHERE name = 'Бесплатный' LIMIT 1;
    
    -- Создаём подписку если её ещё нет
    IF v_org_id IS NOT NULL AND v_free_plan_id IS NOT NULL THEN
        INSERT INTO organization_subscriptions (
            organization_id, plan_id, status, billing_period,
            current_period_end, users_count, base_amount, users_amount, total_amount
        )
        VALUES (
            v_org_id, v_free_plan_id, 'active', 'monthly',
            NOW() + INTERVAL '1 month', 1, 0, 0, 0
        )
        ON CONFLICT (organization_id) DO NOTHING;
    END IF;
END $$;
