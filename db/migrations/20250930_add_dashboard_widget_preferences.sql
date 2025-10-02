-- Table for storing dashboard widget state per user and widget key
create table if not exists public.dashboard_widget_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  widget text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, widget)
);

create index if not exists dashboard_widget_preferences_user_widget_idx
  on public.dashboard_widget_preferences (user_id, widget);

-- Trigger to auto-update updated_at
create or replace function public.dashboard_widget_preferences_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dashboard_widget_preferences_set_updated_at on public.dashboard_widget_preferences;
create trigger dashboard_widget_preferences_set_updated_at
before update on public.dashboard_widget_preferences
for each row
execute function public.dashboard_widget_preferences_touch();

-- Enable RLS and policies
alter table public.dashboard_widget_preferences enable row level security;

drop policy if exists "Select own dashboard_widget_preferences" on public.dashboard_widget_preferences;
create policy "Select own dashboard_widget_preferences"
  on public.dashboard_widget_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "Insert own dashboard_widget_preferences" on public.dashboard_widget_preferences;
create policy "Insert own dashboard_widget_preferences"
  on public.dashboard_widget_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Update own dashboard_widget_preferences" on public.dashboard_widget_preferences;
create policy "Update own dashboard_widget_preferences"
  on public.dashboard_widget_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Delete own dashboard_widget_preferences" on public.dashboard_widget_preferences;
create policy "Delete own dashboard_widget_preferences"
  on public.dashboard_widget_preferences
  for delete
  using (auth.uid() = user_id);
