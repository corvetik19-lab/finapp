-- Transaction transfers double-entry support
create table if not exists public.transaction_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  from_account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid not null references public.accounts(id) on delete cascade,
  amount bigint not null check (amount > 0),
  currency char(3) not null,
  occurred_at timestamptz not null default now(),
  note text,
  expense_txn_id uuid not null references public.transactions(id) on delete cascade,
  income_txn_id uuid not null references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_transaction_transfers_user on public.transaction_transfers(user_id);
create index if not exists idx_transaction_transfers_from_account on public.transaction_transfers(from_account_id);
create index if not exists idx_transaction_transfers_to_account on public.transaction_transfers(to_account_id);
create unique index if not exists idx_transaction_transfers_expense_txn on public.transaction_transfers(expense_txn_id);
create unique index if not exists idx_transaction_transfers_income_txn on public.transaction_transfers(income_txn_id);

alter table public.transaction_transfers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_transfers'
      and policyname = 'transaction_transfers_owner_policy'
  ) then
    create policy "transaction_transfers_owner_policy"
      on public.transaction_transfers
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

create or replace function public.fn_create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount bigint,
  p_currency char(3),
  p_occurred_at timestamptz default null,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_from_currency char(3);
  v_to_currency char(3);
  v_when timestamptz := coalesce(p_occurred_at, now());
  v_expense_txn_id uuid;
  v_income_txn_id uuid;
  v_transfer_id uuid;
begin
  if v_user_id is null then
    raise exception 'fn_create_transfer: auth.uid() is null';
  end if;

  if p_from_account is null or p_to_account is null then
    raise exception 'fn_create_transfer: account ids are required';
  end if;

  if p_from_account = p_to_account then
    raise exception 'fn_create_transfer: accounts must differ';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'fn_create_transfer: amount must be positive';
  end if;

  select currency
    into v_from_currency
    from public.accounts
   where id = p_from_account
     and user_id = v_user_id
     and deleted_at is null;
  if not found then
    raise exception 'fn_create_transfer: source account not found or not owned by user';
  end if;

  select currency
    into v_to_currency
    from public.accounts
   where id = p_to_account
     and user_id = v_user_id
     and deleted_at is null;
  if not found then
    raise exception 'fn_create_transfer: destination account not found or not owned by user';
  end if;

  if v_from_currency <> v_to_currency then
    raise exception 'fn_create_transfer: accounts currencies mismatch';
  end if;

  if v_from_currency <> p_currency then
    raise exception 'fn_create_transfer: currency parameter mismatch';
  end if;

  insert into public.transactions (user_id, account_id, category_id, direction, amount, currency, occurred_at, note, counterparty)
    values (v_user_id, p_from_account, null, 'expense', p_amount, v_from_currency, v_when, p_note, 'Перевод')
    returning id into v_expense_txn_id;

  insert into public.transactions (user_id, account_id, category_id, direction, amount, currency, occurred_at, note, counterparty)
    values (v_user_id, p_to_account, null, 'income', p_amount, v_to_currency, v_when, p_note, 'Перевод')
    returning id into v_income_txn_id;

  insert into public.transaction_transfers (
      user_id,
      from_account_id,
      to_account_id,
      amount,
      currency,
      occurred_at,
      note,
      expense_txn_id,
      income_txn_id
    )
    values (
      v_user_id,
      p_from_account,
      p_to_account,
      p_amount,
      v_from_currency,
      v_when,
      p_note,
      v_expense_txn_id,
      v_income_txn_id
    )
    returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;
