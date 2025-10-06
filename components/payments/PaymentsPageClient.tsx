"use client";

import { useMemo, useState } from "react";
import UpcomingPaymentsCard, { type UpcomingPayment } from "@/components/dashboard/UpcomingPaymentsCard";
import styles from "./PaymentsPageClient.module.css";
import { formatMoney } from "@/lib/utils/format";

type PaymentsPageClientProps = {
  payments: UpcomingPayment[];
  currency: string;
};

const MONTH_OPTIONS = [
  { value: 0, label: "Январь" },
  { value: 1, label: "Февраль" },
  { value: 2, label: "Март" },
  { value: 3, label: "Апрель" },
  { value: 4, label: "Май" },
  { value: 5, label: "Июнь" },
  { value: 6, label: "Июль" },
  { value: 7, label: "Август" },
  { value: 8, label: "Сентябрь" },
  { value: 9, label: "Октябрь" },
  { value: 10, label: "Ноябрь" },
  { value: 11, label: "Декабрь" },
] as const;

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

export default function PaymentsPageClient({ payments, currency }: PaymentsPageClientProps) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const defaultYear = today.getFullYear();
  const defaultMonth = today.getMonth();

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach((payment) => {
      const date = new Date(payment.dueDate);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const yearOptions = useMemo(() => (availableYears.length > 0 ? availableYears : [defaultYear]), [availableYears, defaultYear]);

  const [filterYear, setFilterYear] = useState<number>(yearOptions[0]);
  const [filterMonth, setFilterMonth] = useState<number>(defaultMonth);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const date = new Date(payment.dueDate);
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === filterYear && date.getMonth() === filterMonth;
    });
  }, [payments, filterYear, filterMonth]);

  const pendingPayments = useMemo(() => {
    return filteredPayments.filter((payment) => (payment.status ?? "pending") !== "paid");
  }, [filteredPayments]);

  const stats = useMemo(() => {
    return pendingPayments.reduce(
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
  }, [pendingPayments, today]);

  const nextPayment = useMemo(() => {
    const candidate = pendingPayments.find((payment) => new Date(payment.dueDate) >= today);
    return candidate ?? pendingPayments[0] ?? null;
  }, [pendingPayments, today]);

  const upcomingWindow = useMemo(() => {
    return pendingPayments.filter((payment) => {
      const due = new Date(payment.dueDate);
      const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length;
  }, [pendingPayments, today]);

  const nextPaymentText = nextPayment ? `${nextPayment.name} — ${formatDate(nextPayment.dueDate)}` : "—";

  return (
    <>
      <div className={styles.filters}>
        <label className={styles.filter}>
          <span className={styles.filterLabel}>Год</span>
          <select className={styles.filterSelect} value={filterYear} onChange={(event) => setFilterYear(Number(event.target.value))}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          <span className={styles.filterLabel}>Месяц</span>
          <select className={styles.filterSelect} value={filterMonth} onChange={(event) => setFilterMonth(Number(event.target.value))}>
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Всего платежей</div>
          <div className={styles.statValue}>{filteredPayments.length}</div>
          <div className={styles.statFooter}>{`Активных: ${pendingPayments.length}${stats.overdue > 0 ? `, просрочено: ${stats.overdue}` : ""}`}</div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Ближайшие расходы</div>
          <div className={styles.statValue}>{formatMoney(stats.expense, currency)}</div>
          <div className={styles.statFooter}>Запланированные расходы за месяц</div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Следующий платёж</div>
          <div className={styles.statValueSmall}>{nextPaymentText}</div>
          <div className={styles.statFooter}>Плановая дата ближайшего платежа</div>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statTitle}>Обязательств в 30 дней</div>
          <div className={styles.statValue}>{upcomingWindow}</div>
          <div className={styles.statFooter}>Количество платежей в ближайший месяц</div>
        </article>
      </section>

      <div className={styles.cards}>
        <UpcomingPaymentsCard
          payments={filteredPayments}
          defaultCurrency={currency}
          showOpenAllButton={false}
          showActions={true}
          showFilters={false}
          showStatusBadges={true}
          title="Предстоящие платежи"
          subtitle={`${MONTH_OPTIONS[filterMonth].label} ${filterYear}`}
        />
      </div>
    </>
  );
}
