-- Управление настройками дашборда по виджетам
create extension if not exists "pgcrypto";

create table if not exists public.dashboard_widget_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  widget text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_widget_preferences_user_widget_unique unique (user_id, widget)
);

create index if not exists dashboard_widget_preferences_user_widget_idx
  on public.dashboard_widget_preferences (user_id, widget);

alter table public.dashboard_widget_preferences enable row level security;

create policy "dashboard_widget_preferences_select_own"
  on public.dashboard_widget_preferences for select
  using (user_id = auth.uid());

create policy "dashboard_widget_preferences_insert_own"
  on public.dashboard_widget_preferences for insert
  with check (user_id = auth.uid());

create policy "dashboard_widget_preferences_update_own"
  on public.dashboard_widget_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "dashboard_widget_preferences_delete_own"
  on public.dashboard_widget_preferences for delete
  using (user_id = auth.uid());

create trigger dashboard_widget_preferences_set_updated
  before update on public.dashboard_widget_preferences
  for each row execute function public.set_current_timestamp_updated_at();
