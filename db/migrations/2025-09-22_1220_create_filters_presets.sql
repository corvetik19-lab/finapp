-- Create filters_presets table for saving user filter presets
create extension if not exists "pgcrypto";

create table if not exists public.filters_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint filters_presets_user_name_uniq unique (user_id, name)
);

-- RLS
alter table public.filters_presets enable row level security;

create policy "filters_presets_select_own"
  on public.filters_presets for select
  using (user_id = auth.uid());

create policy "filters_presets_insert_own"
  on public.filters_presets for insert
  with check (user_id = auth.uid());

create policy "filters_presets_update_own"
  on public.filters_presets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "filters_presets_delete_own"
  on public.filters_presets for delete
  using (user_id = auth.uid());

-- Optional helpful index
create index if not exists filters_presets_user_created_idx on public.filters_presets (user_id, created_at desc);
