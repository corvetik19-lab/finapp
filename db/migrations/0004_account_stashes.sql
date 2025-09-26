-- Account stashes ("кубышки") and transfer history
create table if not exists public.account_stashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null default 'Кубышка',
  target_amount bigint,
  balance bigint not null default 0,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_account_stashes_user on public.account_stashes(user_id);
create index if not exists idx_account_stashes_account on public.account_stashes(account_id);

alter table public.account_stashes enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'account_stashes' AND policyname = 'account_stashes_owner_policy'
  ) THEN
    CREATE POLICY "account_stashes_owner_policy" ON public.account_stashes
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

create table if not exists public.account_stash_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  stash_id uuid not null references public.account_stashes(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  direction text not null check (direction in ('to_stash','from_stash')),
  amount bigint not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_stash_transfers_user on public.account_stash_transfers(user_id);
create index if not exists idx_stash_transfers_stash on public.account_stash_transfers(stash_id);
create index if not exists idx_stash_transfers_direction on public.account_stash_transfers(direction);

alter table public.account_stash_transfers enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'account_stash_transfers' AND policyname = 'account_stash_transfers_owner_policy'
  ) THEN
    CREATE POLICY "account_stash_transfers_owner_policy" ON public.account_stash_transfers
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

create extension if not exists moddatetime;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_account_stashes'
  ) THEN
    CREATE TRIGGER set_updated_at_account_stashes BEFORE UPDATE ON public.account_stashes
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;
