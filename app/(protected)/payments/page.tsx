import UpcomingPaymentsCard, {
  type UpcomingPayment,
} from "@/components/dashboard/UpcomingPaymentsCard";
import styles from "./page.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import { formatMoney } from "@/lib/utils/format";

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
    description: record.description ?? undefined,
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
  description: string | null;
};

function getCurrency(payments: UpcomingPayment[]): string {
  return payments.find((payment) => Boolean(payment.currency))?.currency ?? "RUB";
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function PaymentsPage() {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("upcoming_payments")
    .select("id,name,due_date,amount_minor,currency,account_name,direction,description")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("PaymentsPage: failed to load upcoming_payments", error);
  }

  const rawRecords = (data as PaymentRecord[] | null) ?? [];
  const payments = rawRecords.map(toUpcomingPayment);

  const currency = getCurrency(payments);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = payments.reduce(
    (acc, payment) => {
      const amount = Math.abs(payment.amountMinor);
      if (payment.direction === "income") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      if (new Date(payment.dueDate) < today) {
        acc.overdue += 1;
      }
      return acc;
    },
    { income: 0, expense: 0, overdue: 0 }
  );

  const netMinor = stats.income - stats.expense;
  const nextPayment = payments.find((payment) => new Date(payment.dueDate) >= today) ?? payments[0];

  const upcomingWindow = payments.filter((payment) => {
    const due = new Date(payment.dueDate);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Платежи</h1>
        <p className={styles.subtitle}>
          Управляйте напоминаниями о регулярных платежах, контролируйте суммы и сроки, чтобы ничего не пропустить.
        </p>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Активные платежи</div>
          <div className={styles.statValue}>{payments.length}</div>
          <div className={styles.statFooter}>
            {stats.overdue > 0 ? `Просрочено: ${stats.overdue}` : "Все платежи актуальны"}
          </div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Ближайшие расходы</div>
          <div className={styles.statValue}>{formatMoney(stats.expense, currency)}</div>
          <div className={styles.statFooter}>Учтены все расходы, включая будущие напоминания</div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Ожидаемые поступления</div>
          <div className={styles.statValue}>{formatMoney(stats.income, currency)}</div>
          <div className={styles.statFooter}>Регулярные выплаты или поступления работодателя</div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Баланс месяца</div>
          <div className={styles.statValue}>{formatMoney(netMinor, currency)}</div>
          <div className={styles.statFooter}>Доходы минус расходы по всем напоминаниям</div>
        </article>
      </section>

      <div className={styles.cards}>
        <UpcomingPaymentsCard
          payments={payments}
          defaultCurrency={currency}
          showOpenAllButton={false}
          title="Предстоящие платежи"
          subtitle="Следите за сроками и управляйте напоминаниями в одном месте"
        />
        <section className={styles.insightCard}>
          <h2 className={styles.insightTitle}>Инсайты по платежам</h2>
          <p className={styles.insightText}>
            Регулярный контроль платежей помогает вовремя пополнять счета и избегать просрочек. Сохраните карточки
            обязательств и настройте напоминания, чтобы сократить неожиданные траты.
          </p>
          <ul className={styles.insightList}>
            <li>
              Следующий платёж: {nextPayment ? `${nextPayment.name} — ${formatDate(nextPayment.dueDate)}` : "—"}
            </li>
            <li>Обязательств в ближайшие 30 дней: {upcomingWindow}</li>
            <li>Сумма расходов: {formatMoney(stats.expense, currency)}</li>
            <li>Сумма ожидаемых поступлений: {formatMoney(stats.income, currency)}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
