create table if not exists public.note_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 64),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.note_labels enable row level security;

drop policy if exists "note_labels_owner_all" on public.note_labels;
create policy "note_labels_owner_all" on public.note_labels
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists note_labels_user_name_idx on public.note_labels (user_id, lower(name));

create table if not exists public.note_label_links (
  note_id uuid not null references public.notes(id) on delete cascade,
  label_id uuid not null references public.note_labels(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (note_id, label_id)
);

alter table public.note_label_links enable row level security;

drop policy if exists "note_label_links_owner_all" on public.note_label_links;
create policy "note_label_links_owner_all" on public.note_label_links
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists note_label_links_label_idx on public.note_label_links (label_id);
create index if not exists note_label_links_note_idx on public.note_label_links (user_id, note_id);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'note_entity_type') then
    create type public.note_entity_type as enum ('transaction', 'plan');
  end if;
end
$$;

create table if not exists public.note_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  note_id uuid not null references public.notes(id) on delete cascade,
  entity_type public.note_entity_type not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (note_id, entity_type, entity_id)
);

alter table public.note_relations enable row level security;

drop policy if exists "note_relations_owner_all" on public.note_relations;
create policy "note_relations_owner_all" on public.note_relations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists note_relations_entity_idx on public.note_relations (user_id, entity_type, entity_id);
create index if not exists note_relations_note_idx on public.note_relations (user_id, note_id);
