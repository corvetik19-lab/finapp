-- Add status tracking to upcoming payments
alter table public.upcoming_payments
  add column if not exists status text not null default 'pending' check (status in ('pending', 'paid')),
  add column if not exists paid_at timestamptz,
  add column if not exists paid_transaction_id uuid references public.transactions (id) on delete set null;

create index if not exists upcoming_payments_user_status_idx
  on public.upcoming_payments (user_id, status);

-- ensure existing rows have a status value
update public.upcoming_payments
set status = coalesce(status, 'pending');
