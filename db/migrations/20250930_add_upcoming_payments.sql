-- Создание таблицы предстоящих платежей
create table if not exists public.upcoming_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  due_date timestamptz not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'RUB',
  account_name text,
  icon text,
  direction text not null default 'expense' check (direction in ('income', 'expense')),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists upcoming_payments_user_due_date_idx
  on public.upcoming_payments (user_id, due_date);

-- Функция и триггер для обновления updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists upcoming_payments_set_updated_at on public.upcoming_payments;
create trigger upcoming_payments_set_updated_at
before update on public.upcoming_payments
for each row
execute function public.handle_updated_at();

-- RLS и политики
alter table public.upcoming_payments enable row level security;

drop policy if exists "Select own upcoming_payments" on public.upcoming_payments;
create policy "Select own upcoming_payments"
  on public.upcoming_payments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Insert own upcoming_payments" on public.upcoming_payments;
create policy "Insert own upcoming_payments"
  on public.upcoming_payments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Update own upcoming_payments" on public.upcoming_payments;
create policy "Update own upcoming_payments"
  on public.upcoming_payments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own upcoming_payments" on public.upcoming_payments;
create policy "Delete own upcoming_payments"
  on public.upcoming_payments
  for delete
  using (auth.uid() = user_id);
