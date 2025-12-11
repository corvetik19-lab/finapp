-- Создание таблицы шаблонов платежей
create table if not exists public.payment_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'RUB',
  direction text not null default 'expense' check (direction in ('income', 'expense')),
  category_id uuid references public.categories(id) on delete set null,
  day_of_month int check (day_of_month >= 1 and day_of_month <= 31), -- день месяца для автоматической даты
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Индекс для быстрого поиска шаблонов пользователя
create index if not exists payment_templates_user_id_idx
  on public.payment_templates (user_id);

-- Триггер для обновления updated_at
drop trigger if exists payment_templates_set_updated_at on public.payment_templates;
create trigger payment_templates_set_updated_at
before update on public.payment_templates
for each row
execute function public.handle_updated_at();

-- RLS и политики
alter table public.payment_templates enable row level security;

drop policy if exists "Select own payment_templates" on public.payment_templates;
create policy "Select own payment_templates"
  on public.payment_templates
  for select
  using (auth.uid() = user_id);

drop policy if exists "Insert own payment_templates" on public.payment_templates;
create policy "Insert own payment_templates"
  on public.payment_templates
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Update own payment_templates" on public.payment_templates;
create policy "Update own payment_templates"
  on public.payment_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own payment_templates" on public.payment_templates;
create policy "Delete own payment_templates"
  on public.payment_templates
  for delete
  using (auth.uid() = user_id);

comment on table public.payment_templates is 'Шаблоны платежей для быстрого создания повторяющихся платежей';
comment on column public.payment_templates.day_of_month is 'День месяца для автоматического расчёта даты платежа';
