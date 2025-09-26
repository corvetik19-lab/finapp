-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null default 'cash' check (type in ('cash','card','deposit','other')),
  currency char(3) not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_accounts_user on public.accounts(user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  kind text not null check (kind in ('income','expense','transfer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_categories_parent on public.categories(parent_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  direction text not null check (direction in ('income','expense','transfer')),
  amount bigint not null,
  currency char(3) not null,
  occurred_at timestamptz not null,
  note text,
  counterparty text,
  tags jsonb not null default '[]'::jsonb,
  attachment_count integer not null default 0,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_tx_user on public.transactions(user_id);
create index if not exists idx_tx_date on public.transactions(occurred_at);
create index if not exists idx_tx_category on public.transactions(category_id);
create index if not exists idx_tx_account on public.transactions(account_id);
create index if not exists idx_tx_embedding on public.transactions using ivfflat (embedding vector_l2_ops);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id uuid references public.categories(id) on delete set null,
  period_start date not null,
  period_end date not null,
  limit_amount bigint not null,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_budgets_user on public.budgets(user_id);
create index if not exists idx_budgets_category on public.budgets(category_id);
create index if not exists idx_budgets_period on public.budgets(period_start);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  description text,
  goal_amount bigint not null,
  currency char(3) not null,
  plan_type text not null check (plan_type in ('saving','debt')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_plans_user on public.plans(user_id);
create index if not exists idx_plans_type on public.plans(plan_type);

create table if not exists public.plan_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references public.plans(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount bigint not null,
  currency char(3) not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_plan_topups_user on public.plan_topups(user_id);
create index if not exists idx_plan_topups_plan on public.plan_topups(plan_id);
create index if not exists idx_plan_topups_tx on public.plan_topups(transaction_id);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_attachments_user on public.attachments(user_id);
create index if not exists idx_attachments_tx on public.attachments(transaction_id);

create table if not exists public.rules_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  schedule text not null,
  direction text not null check (direction in ('income','expense','transfer')),
  amount bigint not null,
  currency char(3) not null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  next_run timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rules_user on public.rules_recurring(user_id);
create index if not exists idx_rules_next_run on public.rules_recurring(next_run);

create table if not exists public.notifications_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  digest_frequency text not null default 'weekly',
  quiet_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  period_key text not null,
  summary jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_summaries_user on public.ai_summaries(user_id);
create index if not exists idx_ai_summaries_period on public.ai_summaries(period_key);

-- Row Level Security (RLS)
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.plans enable row level security;
alter table public.plan_topups enable row level security;
alter table public.attachments enable row level security;
alter table public.rules_recurring enable row level security;
alter table public.notifications_settings enable row level security;
alter table public.ai_summaries enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'accounts_owner_policy'
  ) THEN
    CREATE POLICY "accounts_owner_policy" ON public.accounts
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_owner_policy'
  ) THEN
    CREATE POLICY "categories_owner_policy" ON public.categories
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_owner_policy'
  ) THEN
    CREATE POLICY "transactions_owner_policy" ON public.transactions
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'budgets' AND policyname = 'budgets_owner_policy'
  ) THEN
    CREATE POLICY "budgets_owner_policy" ON public.budgets
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'plans_owner_policy'
  ) THEN
    CREATE POLICY "plans_owner_policy" ON public.plans
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_topups' AND policyname = 'plan_topups_owner_policy'
  ) THEN
    CREATE POLICY "plan_topups_owner_policy" ON public.plan_topups
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'attachments_owner_policy'
  ) THEN
    CREATE POLICY "attachments_owner_policy" ON public.attachments
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rules_recurring' AND policyname = 'rules_owner_policy'
  ) THEN
    CREATE POLICY "rules_owner_policy" ON public.rules_recurring
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications_settings' AND policyname = 'notif_owner_policy'
  ) THEN
    CREATE POLICY "notif_owner_policy" ON public.notifications_settings
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_summaries' AND policyname = 'ai_summaries_owner_policy'
  ) THEN
    CREATE POLICY "ai_summaries_owner_policy" ON public.ai_summaries
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;
