"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  FileText,
  Wallet,
  TrendingUp,
} from "lucide-react";
import type { PaymentCalendarReport } from "@/lib/accounting/reports";

interface PaymentCalendarProps {
  report: PaymentCalendarReport;
  startDate: string;
  endDate: string;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PaymentCalendar({ report, startDate, endDate }: PaymentCalendarProps) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  const handlePeriodChange = () => {
    const params = new URLSearchParams();
    params.set("start", start);
    params.set("end", end);
    router.push(`/tenders/accounting/calendar?${params.toString()}`);
  };

  const overdueItems = report.items.filter(i => i.status === "overdue");
  const plannedItems = report.items.filter(i => i.status === "planned");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income": return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "expense": return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case "tax": return <Landmark className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "income": return "Поступление";
      case "expense": return "Оплата";
      case "tax": return "Налог";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive">Просрочено</Badge>;
      case "planned":
        return <Badge variant="outline">Запланировано</Badge>;
      case "paid":
        return <Badge variant="secondary">Оплачено</Badge>;
      default:
        return null;
    }
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
              Прогноз поступлений и платежей
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs">С</Label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">По</Label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Button variant="outline" onClick={handlePeriodChange} className="mt-5">
              Показать
            </Button>
          </div>
        </div>
      </div>

      {/* Cash Gap Warning */}
      {report.cashGapWarning && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Внимание: прогнозируется кассовый разрыв!
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {report.cashGapDate && (
                    <>Ожидается {formatDate(report.cashGapDate)}. </>
                  )}
                  Рекомендуем пересмотреть график платежей или обеспечить дополнительное финансирование.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ожидаемые поступления</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatMoney(report.totalIncome)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Планируемые платежи</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMoney(report.totalExpense)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Баланс за период</p>
                <p className={`text-2xl font-bold ${report.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(report.balance)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                report.balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Wallet className={`h-6 w-6 ${report.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Просроченные</p>
                <p className={`text-2xl font-bold ${overdueItems.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {overdueItems.length}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                overdueItems.length > 0 ? 'bg-red-100' : 'bg-muted'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  overdueItems.length > 0 ? 'text-red-600' : 'text-muted-foreground'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Items */}
      {overdueItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Просроченные платежи
            </CardTitle>
            <CardDescription>
              Требуют немедленного внимания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueItems.map((item) => (
                  <TableRow key={item.id} className="bg-red-50 dark:bg-red-950/20">
                    <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        {getTypeLabel(item.type)}
                      </div>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.counterparty || "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      item.type === "income" ? "text-green-600" : "text-red-600"
                    }`}>
                      {item.type === "income" ? "+" : "-"}{formatMoney(item.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Planned Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Запланированные операции
          </CardTitle>
          <CardDescription>
            Ожидаемые поступления и платежи на {formatDate(startDate)} — {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plannedItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plannedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        {getTypeLabel(item.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.documentId ? (
                        <Link 
                          href={`/tenders/accounting/documents/${item.documentId}`}
                          className="text-primary hover:underline"
                        >
                          {item.description}
                        </Link>
                      ) : (
                        item.description
                      )}
                    </TableCell>
                    <TableCell>{item.counterparty || "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      item.type === "income" ? "text-green-600" : "text-red-600"
                    }`}>
                      {item.type === "income" ? "+" : "-"}{formatMoney(item.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет запланированных операций на выбранный период</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/dds">
            <Wallet className="h-4 w-4 mr-2" />
            Отчёт ДДС
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/pnl">
            <TrendingUp className="h-4 w-4 mr-2" />
            P&L по тендерам
          </Link>
        </Button>
      </div>
    </div>
  );
}
