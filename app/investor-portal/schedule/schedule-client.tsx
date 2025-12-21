"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface Payment {
  id: string;
  investment_number: string;
  source_name: string;
  tender_subject: string;
  due_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
}

interface Props {
  payments: Payment[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function PaymentScheduleClient({ payments }: Props) {
  // Группируем по месяцам
  const groupedByMonth: Record<string, Payment[]> = {};

  payments.forEach((payment) => {
    const date = new Date(payment.due_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(payment);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();

  // Статистика
  const totalRemaining = payments.reduce((sum, p) => sum + p.remaining_amount, 0);
  const overdueCount = payments.filter((p) => getDaysUntil(p.due_date) < 0).length;
  const thisMonthCount = payments.filter((p) => {
    const days = getDaysUntil(p.due_date);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">График платежей</h1>
        <p className="text-muted-foreground">Календарь возвратов по вашим инвестициям</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Всего к возврату
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} платежей</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              В ближайший месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthCount}</div>
            <p className="text-xs text-muted-foreground">платежей ожидается</p>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? "text-red-500" : "text-slate-400"}`} />
              Просроченные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueCount === 0 ? "Нет просрочек" : "Требуют внимания"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline by Month */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Нет активных платежей</p>
            <p className="text-sm text-muted-foreground">
              Все инвестиции возвращены или нет активных инвестиций
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthKey) => {
            const monthPayments = groupedByMonth[monthKey];
            const [year, month] = monthKey.split("-").map(Number);
            const monthDate = new Date(year, month - 1, 1);

            return (
              <Card key={monthKey}>
                <CardHeader>
                  <CardTitle className="capitalize">{getMonthName(monthDate)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthPayments.map((payment) => {
                      const daysUntil = getDaysUntil(payment.due_date);
                      const isOverdue = daysUntil < 0;
                      const isUrgent = daysUntil >= 0 && daysUntil <= 7;

                      return (
                        <Link
                          key={payment.id}
                          href={`/investor-portal/investments/${payment.id}`}
                          className={`
                            flex items-center justify-between p-4 rounded-lg border transition-colors
                            ${isOverdue ? "border-red-200 bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            {/* Date Badge */}
                            <div className={`
                              w-14 h-14 rounded-lg flex flex-col items-center justify-center text-center
                              ${isOverdue ? "bg-red-500 text-white" : isUrgent ? "bg-orange-500 text-white" : "bg-slate-100"}
                            `}>
                              <span className="text-lg font-bold">
                                {new Date(payment.due_date).getDate()}
                              </span>
                              <span className="text-[10px] uppercase">
                                {new Date(payment.due_date).toLocaleDateString("ru-RU", { month: "short" })}
                              </span>
                            </div>

                            {/* Info */}
                            <div>
                              <p className="font-medium">{payment.investment_number}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {payment.tender_subject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.source_name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              {formatMoney(payment.remaining_amount)}
                            </p>
                            <Badge
                              variant={isOverdue ? "destructive" : isUrgent ? "outline" : "secondary"}
                            >
                              {isOverdue
                                ? `Просрочено ${Math.abs(daysUntil)} дн.`
                                : daysUntil === 0
                                  ? "Сегодня"
                                  : `Через ${daysUntil} дн.`}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
