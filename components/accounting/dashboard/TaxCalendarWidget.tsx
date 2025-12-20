"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { TaxCalendarData } from "@/lib/accounting/dashboard/types";
import { formatMoney } from "@/lib/accounting/types";
import Link from "next/link";

interface TaxCalendarWidgetProps {
  data: TaxCalendarData;
}

export function TaxCalendarWidget({ data }: TaxCalendarWidgetProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return "сегодня";
    if (days === 1) return "завтра";
    if (days < 0) return `${Math.abs(days)} дн. назад`;
    return `через ${days} дн.`;
  };

  const allPayments = [
    ...data.overduePayments.map(p => ({ ...p, isOverdue: true })),
    ...data.upcomingPayments.map(p => ({ ...p, isOverdue: false })),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Налоговый календарь
          </div>
          {data.overduePayments.length > 0 && (
            <span className="flex items-center gap-1 text-sm font-normal text-red-600">
              <AlertCircle className="h-4 w-4" />
              {data.overduePayments.length} просрочено
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-xs text-muted-foreground">К оплате (30 дн.)</div>
              <div className="text-lg font-bold text-orange-600">
                {formatMoney(data.totalUpcoming)}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-xs text-muted-foreground">Просрочено</div>
              <div className="text-lg font-bold text-red-600">
                {formatMoney(data.totalOverdue)}
              </div>
            </div>
          </div>

          {data.nextPaymentDate && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-muted-foreground">Ближайший платёж</span>
              <span className="font-medium text-blue-600">
                {formatDate(data.nextPaymentDate)}
              </span>
            </div>
          )}

          {allPayments.length > 0 ? (
            <div>
              <div className="text-sm font-medium mb-2">Платежи</div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {allPayments.slice(0, 6).map((payment) => (
                  <div
                    key={payment.id}
                    className={`p-3 rounded-lg ${
                      payment.isOverdue ? "bg-red-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{payment.taxName}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{payment.periodYear}</span>
                          {payment.periodQuarter && (
                            <span>Q{payment.periodQuarter}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${payment.isOverdue ? "text-red-600" : ""}`}>
                          {formatMoney(payment.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs">
                        {payment.isOverdue ? (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={payment.isOverdue ? "text-red-500" : "text-muted-foreground"}>
                          {getDaysLabel(payment.daysUntilDue)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(payment.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <div className="text-sm text-muted-foreground">
                Нет предстоящих платежей
              </div>
            </div>
          )}

          <Link
            href="/tenders/accounting/taxes/calendar"
            className="block text-center text-sm text-orange-600 hover:text-orange-700 py-2"
          >
            Полный календарь →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
