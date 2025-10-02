create extension if not exists "uuid-ossp";
create extension if not exists moddatetime schema public;

create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "notes_select" on public.notes;
drop policy if exists "notes_insert" on public.notes;
drop policy if exists "notes_update" on public.notes;
drop policy if exists "notes_delete" on public.notes;

create policy "notes_select" on public.notes
  for select
  using (user_id = auth.uid());

create policy "notes_insert" on public.notes
  for insert
  with check (user_id = auth.uid());

create policy "notes_update" on public.notes
  for update
  using (user_id = auth.uid());

create policy "notes_delete" on public.notes
  for delete
  using (user_id = auth.uid());

create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute procedure moddatetime(updated_at);
