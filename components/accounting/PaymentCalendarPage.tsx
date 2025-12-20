"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/accounting/types";
import {
  PaymentCalendarItem,
  PaymentCalendarSummary,
  PaymentCategory,
  PaymentCalendarStatus,
  paymentCategoryLabels,
  paymentStatusLabels,
  paymentPriorityLabels,
} from "@/lib/accounting/payment-calendar/types";
import {
  createPaymentCalendarItem,
  updatePaymentStatus,
} from "@/lib/accounting/payment-calendar/service";
import { AccountingCounterparty } from "@/lib/accounting/types";

interface PaymentCalendarPageProps {
  payments: PaymentCalendarItem[];
  summary: PaymentCalendarSummary;
  counterparties: AccountingCounterparty[];
}

const statusColors: Record<PaymentCalendarStatus, string> = {
  planned: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  overdue: "bg-red-100 text-red-800",
};

export function PaymentCalendarPage({
  payments,
  summary,
  counterparties,
}: PaymentCalendarPageProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<PaymentCalendarStatus | "all">("all");

  const [newPayment, setNewPayment] = useState({
    payment_type: "expense" as "income" | "expense",
    category: "other" as PaymentCategory,
    name: "",
    amount: "",
    planned_date: new Date().toISOString().split("T")[0],
    counterparty_id: "",
    counterparty_name: "",
    priority: "normal" as "low" | "normal" | "high" | "critical",
    notes: "",
  });

  const filteredPayments = payments.filter((p) => {
    if (filter !== "all" && p.payment_type !== filter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  // Группировка по датам
  const groupedPayments = filteredPayments.reduce((acc, payment) => {
    const date = payment.planned_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(payment);
    return acc;
  }, {} as Record<string, PaymentCalendarItem[]>);

  const sortedDates = Object.keys(groupedPayments).sort();

  const handleCreate = async () => {
    if (!newPayment.name || !newPayment.amount) return;

    setIsCreating(true);
    try {
      const result = await createPaymentCalendarItem({
        payment_type: newPayment.payment_type,
        category: newPayment.category,
        name: newPayment.name,
        amount: Math.round(parseFloat(newPayment.amount) * 100),
        planned_date: newPayment.planned_date,
        counterparty_id: newPayment.counterparty_id || undefined,
        counterparty_name: newPayment.counterparty_name || undefined,
        priority: newPayment.priority,
        notes: newPayment.notes || undefined,
      });

      if (result.success) {
        setIsCreateOpen(false);
        router.refresh();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    await updatePaymentStatus(id, "paid");
    router.refresh();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Платёжный календарь
            </h1>
            <p className="text-muted-foreground">
              Планирование и контроль платежей
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить платёж
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый платёж</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select
                    value={newPayment.payment_type}
                    onValueChange={(v) =>
                      setNewPayment({ ...newPayment, payment_type: v as "income" | "expense" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Поступление</SelectItem>
                      <SelectItem value="expense">Расход</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={newPayment.category}
                    onValueChange={(v) =>
                      setNewPayment({ ...newPayment, category: v as PaymentCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={newPayment.name}
                  onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                  placeholder="Описание платежа"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={newPayment.planned_date}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, planned_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Контрагент</Label>
                <Select
                  value={newPayment.counterparty_id}
                  onValueChange={(v) => {
                    const cp = counterparties.find((c) => c.id === v);
                    setNewPayment({
                      ...newPayment,
                      counterparty_id: v,
                      counterparty_name: cp?.name || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контрагента" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select
                  value={newPayment.priority}
                  onValueChange={(v) =>
                    setNewPayment({
                      ...newPayment,
                      priority: v as "low" | "normal" | "high" | "critical",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentPriorityLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreate}
                disabled={!newPayment.name || !newPayment.amount || isCreating}
                className="w-full"
              >
                {isCreating ? "Создание..." : "Добавить платёж"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Сегодня приход
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatMoney(summary.today.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Сегодня расход
            </div>
            <div className="text-xl font-bold text-red-600">
              {formatMoney(summary.today.expense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              За неделю
            </div>
            <div className={`text-xl font-bold ${summary.thisWeek.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatMoney(summary.thisWeek.balance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Просрочено
            </div>
            <div className="text-xl font-bold text-red-600">
              {summary.overdue.count} ({formatMoney(summary.overdue.amount)})
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              Предстоит
            </div>
            <div className="text-xl font-bold text-blue-600">
              {summary.upcoming.count} ({formatMoney(summary.upcoming.amount)})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Все
              </Button>
              <Button
                variant={filter === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("income")}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Поступления
              </Button>
              <Button
                variant={filter === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("expense")}
              >
                <TrendingDown className="h-4 w-4 mr-1" />
                Расходы
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Все статусы
              </Button>
              <Button
                variant={statusFilter === "planned" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("planned")}
              >
                Запланировано
              </Button>
              <Button
                variant={statusFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("overdue")}
              >
                Просрочено
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
              >
                Оплачено
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Календарь платежей */}
      <Card>
        <CardHeader>
          <CardTitle>Платежи</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Платежи не найдены</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const dayPayments = groupedPayments[date];
                const dayIncome = dayPayments
                  .filter((p) => p.payment_type === "income")
                  .reduce((sum, p) => sum + p.amount, 0);
                const dayExpense = dayPayments
                  .filter((p) => p.payment_type === "expense")
                  .reduce((sum, p) => sum + p.amount, 0);

                return (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">
                        {new Date(date).toLocaleDateString("ru-RU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </h3>
                      <div className="flex gap-4 text-sm">
                        {dayIncome > 0 && (
                          <span className="text-green-600">+{formatMoney(dayIncome)}</span>
                        )}
                        {dayExpense > 0 && (
                          <span className="text-red-600">-{formatMoney(dayExpense)}</span>
                        )}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Описание</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead>Контрагент</TableHead>
                          <TableHead className="text-right">Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {payment.payment_type === "income" ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                )}
                                {payment.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {paymentCategoryLabels[payment.category]}
                            </TableCell>
                            <TableCell>
                              {payment.counterparty_name || "—"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                payment.payment_type === "income"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {payment.payment_type === "income" ? "+" : "-"}
                              {formatMoney(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[payment.status]}>
                                {paymentStatusLabels[payment.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payment.status !== "paid" &&
                                payment.status !== "cancelled" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkPaid(payment.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
