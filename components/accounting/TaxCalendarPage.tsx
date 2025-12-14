"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calculator
} from "lucide-react";
import { 
  TaxCalendarEvent,
  TaxPayment,
  AccountingSettings,
  formatMoney,
  getMonthName,
  TAX_PAYMENT_STATUSES,
  TAX_TYPES
} from "@/lib/accounting/types";

interface TaxCalendarPageProps {
  events: TaxCalendarEvent[];
  payments: TaxPayment[];
  settings: AccountingSettings | null;
  year: number;
}

export function TaxCalendarPage({ events, payments, settings, year }: TaxCalendarPageProps) {
  // Группируем события по месяцам
  const eventsByMonth = useMemo(() => {
    const months: Record<number, { events: TaxCalendarEvent[]; payments: TaxPayment[] }> = {};
    
    // Инициализируем все месяцы
    for (let i = 1; i <= 12; i++) {
      months[i] = { events: [], payments: [] };
    }
    
    // Распределяем события
    events.forEach(event => {
      const month = new Date(event.event_date).getMonth() + 1;
      if (months[month]) {
        months[month].events.push(event);
      }
    });
    
    // Распределяем платежи по срокам
    payments.forEach(payment => {
      const month = new Date(payment.due_date).getMonth() + 1;
      if (months[month]) {
        months[month].payments.push(payment);
      }
    });
    
    return months;
  }, [events, payments]);

  // Статистика по платежам
  const stats = useMemo(() => {
    const pending = payments.filter(p => p.status === 'pending' || p.status === 'partial');
    const paid = payments.filter(p => p.status === 'paid');
    const overdue = payments.filter(p => p.status === 'overdue');
    
    const totalToPay = pending.reduce((sum, p) => sum + (p.calculated_amount - p.paid_amount), 0);
    const totalPaid = paid.reduce((sum, p) => sum + p.paid_amount, 0);
    const totalOverdue = overdue.reduce((sum, p) => sum + (p.calculated_amount - p.paid_amount), 0);
    
    return {
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length,
      totalToPay,
      totalPaid,
      totalOverdue,
    };
  }, [payments]);

  // Ближайшие платежи
  const upcomingPayments = useMemo(() => {
    return payments
      .filter(p => p.status === 'pending' || p.status === 'partial')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);
  }, [payments]);

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting/taxes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Календарь налоговых платежей
            </h1>
            <p className="text-muted-foreground">{year} год</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ожидают оплаты</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatMoney(stats.totalToPay)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оплачено</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.paid}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatMoney(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdue}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatMoney(stats.totalOverdue)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего к оплате</CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatMoney(stats.totalToPay + stats.totalOverdue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ближайшие платежи */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ближайшие платежи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayments.map(payment => {
                const dueDate = new Date(payment.due_date);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntil <= 7;
                const remaining = payment.calculated_amount - payment.paid_amount;
                
                return (
                  <div 
                    key={payment.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isUrgent ? 'border-red-200 bg-red-50' : 'border-muted'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{payment.tax_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {TAX_TYPES[payment.tax_type as keyof typeof TAX_TYPES] || payment.tax_type}
                        {payment.period_quarter && ` • ${payment.period_quarter} квартал`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Срок: {dueDate.toLocaleDateString('ru-RU')}
                        {isUrgent && (
                          <Badge variant="destructive" className="ml-2">
                            {daysUntil <= 0 ? 'Сегодня!' : `${daysUntil} дн.`}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatMoney(remaining)}</p>
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: `${TAX_PAYMENT_STATUSES[payment.status]?.color}20`,
                          color: TAX_PAYMENT_STATUSES[payment.status]?.color 
                        }}
                      >
                        {TAX_PAYMENT_STATUSES[payment.status]?.name}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Календарь по месяцам */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
          const monthData = eventsByMonth[month];
          const hasItems = monthData.events.length > 0 || monthData.payments.length > 0;
          const currentMonth = new Date().getMonth() + 1;
          const isCurrentMonth = month === currentMonth;
          
          return (
            <Card 
              key={month} 
              className={`${isCurrentMonth ? 'ring-2 ring-primary' : ''} ${!hasItems ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {getMonthName(month)}
                  {isCurrentMonth && (
                    <Badge variant="outline" className="text-xs">Текущий</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasItems ? (
                  <p className="text-sm text-muted-foreground">Нет событий</p>
                ) : (
                  <div className="space-y-2">
                    {monthData.payments.map(payment => {
                      const statusInfo = TAX_PAYMENT_STATUSES[payment.status];
                      const remaining = payment.calculated_amount - payment.paid_amount;
                      
                      return (
                        <div 
                          key={payment.id}
                          className="text-sm p-2 rounded border"
                          style={{ borderColor: statusInfo?.color }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate flex-1">
                              {payment.tax_name}
                            </span>
                            {payment.status === 'paid' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 ml-1" />
                            ) : payment.status === 'overdue' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 ml-1" />
                            ) : (
                              <Clock className="h-4 w-4 text-orange-500 flex-shrink-0 ml-1" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.due_date).getDate()} числа
                          </div>
                          {payment.status !== 'paid' && (
                            <div className="font-medium" style={{ color: statusInfo?.color }}>
                              {formatMoney(remaining)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {monthData.events.map(event => (
                      <div 
                        key={event.id}
                        className={`text-sm p-2 rounded border ${
                          event.is_completed ? 'bg-green-50 border-green-200' : 'border-muted'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {event.is_completed ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="truncate">{event.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.event_date).getDate()} числа
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Стандартные сроки */}
      <Card>
        <CardHeader>
          <CardTitle>Стандартные сроки уплаты налогов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">УСН (авансы)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>28 апреля — I квартал</li>
                <li>28 июля — II квартал</li>
                <li>28 октября — III квартал</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">УСН (годовой)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>28 апреля — для ООО</li>
                <li>28 апреля — для ИП</li>
              </ul>
            </div>
            
            {settings?.organization_type === 'ip' && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Страховые взносы ИП</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>31 декабря — фиксированные</li>
                  <li>1 июля (след. год) — 1% свыше</li>
                </ul>
              </div>
            )}
            
            {settings?.vat_payer && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">НДС</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>28 числа — ежемесячно (1/3)</li>
                  <li>Декларация — до 25 числа</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
