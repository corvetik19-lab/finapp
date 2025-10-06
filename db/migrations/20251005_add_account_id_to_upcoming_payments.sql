-- Добавление колонки account_id в таблицу upcoming_payments
-- Для связи платежа со счётом из выбранной транзакции при отметке "оплачено"

alter table public.upcoming_payments
add column if not exists account_id uuid references public.accounts (id) on delete set null;

-- Индекс для оптимизации поиска по account_id
create index if not exists upcoming_payments_account_id_idx
  on public.upcoming_payments (account_id);

-- Комментарий для документации
comment on column public.upcoming_payments.account_id is 'Ссылка на счёт из транзакции, которой был оплачен платёж';
