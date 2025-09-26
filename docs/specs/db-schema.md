# Схема БД и политики RLS

## Общие требования

- Все таблицы содержат поле `user_id uuid`, ссылающееся на `auth.users`.
- Денежные значения храним в минорных единицах (`bigint`).
- Даты и время в БД — `timestamptz` (UTC).
- Включён `pgcrypto` (для `gen_random_uuid()`) и `pgvector` (векторное поле для транзакций).
- Для каждой таблицы включена RLS, политики `user_id = auth.uid()` для SELECT/INSERT/UPDATE/DELETE.
- Индексы по часто используемым полям (`user_id`, `occurred_at`, `category_id`, `account_id`, `embedding`).

## Таблицы

### `accounts`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `type text check (type in ('cash','card','deposit','other')) default 'other'`
- `currency char(3) not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `deleted_at timestamptz`
- Индексы: `user_id`

### `categories`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `parent_id uuid references categories(id)`
- `kind text check (kind in ('income','expense','transfer')) not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `deleted_at timestamptz`
- Индексы: `user_id`, `parent_id`

### `transactions`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `account_id uuid not null references accounts(id)`
- `category_id uuid references categories(id)`
- `direction text check (direction in ('income','expense','transfer')) not null`
- `amount bigint not null`
- `currency char(3) not null`
- `occurred_at timestamptz not null`
- `note text`
- `counterparty text`
- `tags jsonb default '[]'::jsonb`
- `attachment_count integer default 0`
- `embedding vector(1536)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `deleted_at timestamptz`
- Индексы: `user_id`, `occurred_at`, `category_id`, `account_id`, `embedding` (ivfflat)

### `budgets`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `category_id uuid references categories(id)`
- `period_start date not null`
- `period_end date not null`
- `limit_amount bigint not null`
- `currency char(3) not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- Индексы: `user_id`, `category_id`, `period_start`

### `plans`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `name text not null`
- `description text`
- `goal_amount bigint not null`
- `currency char(3) not null`
- `plan_type text check (plan_type in ('saving','debt')) not null`
- `target_date date`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- Индексы: `user_id`, `plan_type`

### `plan_topups`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `plan_id uuid not null references plans(id)`
- `transaction_id uuid references transactions(id)`
- `amount bigint not null`
- `currency char(3) not null`
- `occurred_at timestamptz not null`
- `created_at timestamptz default now()`
- Индексы: `user_id`, `plan_id`, `transaction_id`

### `attachments`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `transaction_id uuid not null references transactions(id)`
- `storage_path text not null`
- `mime_type text`
- `size_bytes bigint`
- `created_at timestamptz default now()`
- `deleted_at timestamptz`
- Индексы: `user_id`, `transaction_id`

### `rules_recurring`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `name text not null`
- `schedule text not null`
- `direction text check (direction in ('income','expense','transfer')) not null`
- `amount bigint not null`
- `currency char(3) not null`
- `account_id uuid references accounts(id)`
- `category_id uuid references categories(id)`
- `next_run timestamptz`
- `meta jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- Индексы: `user_id`, `next_run`

### `notifications_settings`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null unique`
- `email_enabled boolean default true`
- `push_enabled boolean default false`
- `digest_frequency text default 'weekly'`
- `quiet_hours jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `ai_summaries`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `period_key text not null`
- `summary jsonb not null`
- `created_at timestamptz default now()`
- Индексы: `user_id`, `period_key`

## RLS Политики (паттерн)

```sql
alter table <table> enable row level security;

create policy "Allow select own <table>" on <table>
  for select using (auth.uid() = user_id);

create policy "Allow insert own <table>" on <table>
  for insert with check (auth.uid() = user_id);

create policy "Allow update own <table>" on <table>
  for update using (auth.uid() = user_id);

create policy "Allow delete own <table>" on <table>
  for delete using (auth.uid() = user_id);
```

## Индексы

- `transactions_embedding_idx` — `USING ivfflat (embedding vector_l2_ops) WITH (lists=100)` (для `pgvector`).
- BTREE индексы по `user_id`, `occurred_at`, `category_id`, `account_id` в ключевых таблицах.
- Для справочников (`notifications_settings`) уникальный индекс на `user_id`.

## Следующие шаги

1. Подготовить файл миграции (`db/migrations/0001_init.sql`) с `CREATE TABLE`, индексами, включением RLS и политиками.
2. Добавить включение расширений `pgcrypto`, `pgvector`.
3. Задокументировать применение миграций и базовые проверки.
