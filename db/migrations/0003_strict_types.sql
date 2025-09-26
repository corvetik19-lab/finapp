-- Strict typing and legacy cleanup
-- 1) Ensure extensions used for triggers
create extension if not exists moddatetime;

-- 2) Currency ISO-4217 checks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_currency_iso') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT chk_accounts_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_currency_iso') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_currency_iso') THEN
    ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plans_currency_iso') THEN
    ALTER TABLE public.plans ADD CONSTRAINT chk_plans_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_topups_currency_iso') THEN
    ALTER TABLE public.plan_topups ADD CONSTRAINT chk_plan_topups_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rules_recurring_currency_iso') THEN
    ALTER TABLE public.rules_recurring ADD CONSTRAINT chk_rules_recurring_currency_iso CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;

-- 3) Align accounts.type enum-like check (bank -> deposit)
UPDATE public.accounts SET type = 'deposit' WHERE type = 'bank';
DO $$
DECLARE cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class r ON r.oid = c.conrelid
  WHERE r.relname = 'accounts' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%type%ANY%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.accounts DROP CONSTRAINT %I', cname);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_type') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT chk_accounts_type CHECK (type IN ('cash','card','deposit','other'));
  END IF;
END
$$;

-- 4) Drop legacy columns that have been replaced
-- Budgets: drop old period (using period_start/period_end)
ALTER TABLE public.budgets DROP COLUMN IF EXISTS period;

-- Plans: drop legacy columns now that plan_type/goal_amount exist
ALTER TABLE public.plans DROP COLUMN IF EXISTS type;
ALTER TABLE public.plans DROP COLUMN IF EXISTS target_amount;

-- Attachments: drop legacy file_path/mime (migrated to storage_path/mime_type)
ALTER TABLE public.attachments DROP COLUMN IF EXISTS file_path;
ALTER TABLE public.attachments DROP COLUMN IF EXISTS mime;

-- Notifications: drop legacy settings (structured fields exist)
ALTER TABLE public.notifications_settings DROP COLUMN IF EXISTS settings;

-- AI summaries: drop legacy text fields (using period_key/summary jsonb)
ALTER TABLE public.ai_summaries DROP COLUMN IF EXISTS period;
ALTER TABLE public.ai_summaries DROP COLUMN IF EXISTS summary_md;

-- 5) updated_at triggers using moddatetime
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_accounts'
  ) THEN
    CREATE TRIGGER set_updated_at_accounts BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_categories'
  ) THEN
    CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_transactions'
  ) THEN
    CREATE TRIGGER set_updated_at_transactions BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_budgets'
  ) THEN
    CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_plans'
  ) THEN
    CREATE TRIGGER set_updated_at_plans BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_rules_recurring'
  ) THEN
    CREATE TRIGGER set_updated_at_rules_recurring BEFORE UPDATE ON public.rules_recurring
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_notifications_settings'
  ) THEN
    CREATE TRIGGER set_updated_at_notifications_settings BEFORE UPDATE ON public.notifications_settings
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;
