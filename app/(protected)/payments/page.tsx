import type { UpcomingPayment } from "@/components/dashboard/UpcomingPaymentsCard";
import styles from "./page.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import PaymentsPageClient from "@/components/payments/PaymentsPageClient";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

function toUpcomingPayment(record: PaymentRecord): UpcomingPayment {
  return {
    id: record.id,
    name: record.name?.trim() ? record.name : "Без названия",
    dueDate: record.due_date,
    amountMinor: Math.abs(record.amount_minor ?? 0),
    currency: record.currency ?? undefined,
    accountName: record.account_name ?? undefined,
    direction:
      record.direction === "income"
        ? "income"
        : record.direction === "expense"
          ? "expense"
          : undefined,
    status: record.status ?? undefined,
    paidAt: record.paid_at ?? null,
    paidTransactionId: record.paid_transaction_id ?? null,
  };
}

type PaymentRecord = {
  id: string;
  name: string | null;
  due_date: string;
  amount_minor: number;
  currency: string | null;
  account_name: string | null;
  direction: "income" | "expense" | "transfer" | null;
  status: "pending" | "paid" | null;
  paid_at: string | null;
  paid_transaction_id: string | null;
};

function getCurrency(payments: UpcomingPayment[]): string {
  return payments.find((payment) => Boolean(payment.currency))?.currency ?? "RUB";
}

export default async function PaymentsPage() {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("upcoming_payments")
    .select(`
      id,name,due_date,amount_minor,currency,account_name,account_id,direction,status,paid_at,paid_transaction_id,
      accounts:account_id(name),
      transactions:paid_transaction_id(account_id,accounts:account_id(name))
    `)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("PaymentsPage: failed to load upcoming_payments", error);
  }

  const rawRecords = (data ?? []) as unknown as (PaymentRecord & {
    accounts?: { name: string } | null;
    transactions?: { accounts?: { name?: string } | null } | null;
  })[];
  const payments = rawRecords.map((item) => {
    // Приоритет получения названия счёта:
    // 1) JOIN из account_id платежа
    // 2) JOIN из account_id транзакции (для старых платежей)
    // 3) Старое поле account_name
    let accountName = item.account_name ?? null;
    
    if (item.accounts && typeof item.accounts === 'object' && 'name' in item.accounts) {
      accountName = item.accounts.name;
    }
    else if (item.transactions && typeof item.transactions === 'object') {
      const txn = item.transactions;
      if (txn.accounts && typeof txn.accounts === 'object' && 'name' in txn.accounts) {
        accountName = txn.accounts.name ?? null;
      }
    }

    return toUpcomingPayment({ ...item, account_name: accountName });
  });
  const currency = getCurrency(payments);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Платежи</h1>
      </header>

      <PaymentsPageClient payments={payments} currency={currency} />
    </div>
  );
}
