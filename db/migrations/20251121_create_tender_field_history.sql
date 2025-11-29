-- Create table for tracking tender field history
create table if not exists public.tender_field_history (
    id uuid not null default gen_random_uuid(),
    tender_id uuid not null references public.tenders(id) on delete cascade,
    field_name text not null,
    old_value text,
    new_value text,
    changed_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    
    constraint tender_field_history_pkey primary key (id)
);

-- Add RLS policies
alter table public.tender_field_history enable row level security;

create policy "Users can view history of their company tenders"
    on public.tender_field_history for select
    using (
        exists (
            select 1 from public.tenders
            where tenders.id = tender_field_history.tender_id
            and tenders.company_id = (
                select company_id from public.employees
                where user_id = auth.uid()
                limit 1
            )
        )
    );

create policy "Users can insert history for their company tenders"
    on public.tender_field_history for insert
    with check (
        exists (
            select 1 from public.tenders
            where tenders.id = tender_field_history.tender_id
            and tenders.company_id = (
                select company_id from public.employees
                where user_id = auth.uid()
                limit 1
            )
        )
    );

-- Create index for faster lookups
create index if not exists idx_tender_field_history_tender_id on public.tender_field_history(tender_id);
