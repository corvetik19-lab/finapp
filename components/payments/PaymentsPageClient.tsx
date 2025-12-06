"use client";

import { useMemo, useState } from "react";
import UpcomingPaymentsCard, { type UpcomingPayment } from "@/components/dashboard/UpcomingPaymentsCard";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, CreditCard, Clock, AlertTriangle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Год</span>
          <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Месяц</span>
          <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTH_OPTIONS.map((month) => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><CalendarDays className="h-5 w-5 text-blue-600" /></div>
              <div>
                <div className="text-sm text-muted-foreground">Всего платежей</div>
                <div className="text-2xl font-bold">{filteredPayments.length}</div>
                <div className="text-xs text-muted-foreground">{`Активных: ${pendingPayments.length}${stats.overdue > 0 ? `, просрочено: ${stats.overdue}` : ""}`}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><CreditCard className="h-5 w-5 text-red-600" /></div>
              <div>
                <div className="text-sm text-muted-foreground">Ближайшие расходы</div>
                <div className="text-2xl font-bold">{formatMoney(stats.expense, currency)}</div>
                <div className="text-xs text-muted-foreground">Запланированные расходы за месяц</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <div className="text-sm text-muted-foreground">Следующий платёж</div>
                <div className="text-lg font-semibold truncate max-w-[180px]">{nextPaymentText}</div>
                <div className="text-xs text-muted-foreground">Плановая дата ближайшего платежа</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><AlertTriangle className="h-5 w-5 text-purple-600" /></div>
              <div>
                <div className="text-sm text-muted-foreground">Обязательств в 30 дней</div>
                <div className="text-2xl font-bold">{upcomingWindow}</div>
                <div className="text-xs text-muted-foreground">Количество платежей в ближайший месяц</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список платежей */}
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
  );
}
