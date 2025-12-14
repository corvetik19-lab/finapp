"use client";

import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import type { Investment, InvestmentTransaction } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS, INTEREST_TYPE_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props {
  investment: Investment;
  transactions: InvestmentTransaction[];
  canViewFinancials: boolean;
}

export function InvestorInvestmentClient({ investment, transactions, canViewFinancials }: Props) {
  const remainingPrincipal = investment.approved_amount - investment.returned_principal;
  const remainingInterest = investment.interest_amount - investment.returned_interest;
  const totalRemaining = remainingPrincipal + remainingInterest;
  const paidPercent = investment.total_return_amount > 0
    ? ((investment.returned_principal + investment.returned_interest) / investment.total_return_amount) * 100
    : 0;

  const today = new Date();
  const dueDate = new Date(investment.due_date);
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const isOverdue = daysLeft < 0 && investment.status !== "completed";

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", requested: "outline", approved: "default", received: "default",
    in_progress: "default", returning: "outline", completed: "secondary", overdue: "destructive", cancelled: "secondary",
  };

  const transactionTypeLabels: Record<string, string> = {
    receipt: "Получение",
    return_principal: "Возврат долга",
    return_interest: "Возврат процентов",
    penalty: "Пеня",
    adjustment: "Корректировка",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/investor-portal/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{investment.investment_number}</h1>
            <p className="text-muted-foreground">{investment.source?.name}</p>
          </div>
          <Badge variant={statusVariants[investment.status] || "secondary"} className="text-sm">
            {INVESTMENT_STATUS_LABELS[investment.status]}
          </Badge>
        </div>

        {/* Alert */}
        {isOverdue && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-destructive">
                Просрочено на {Math.abs(daysLeft)} дней
              </span>
            </CardContent>
          </Card>
        )}

        {/* Main Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Сумма инвестиции</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatMoney(investment.approved_amount)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {investment.interest_rate}% {INTEREST_TYPE_LABELS[investment.interest_type]} на {investment.period_days} дней
              </div>
            </CardContent>
          </Card>

          <Card className={cn(isOverdue && "border-destructive")}>
            <CardHeader>
              <CardTitle className="text-lg">Срок возврата</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dueDate.toLocaleDateString("ru-RU")}</div>
              <div className={cn(
                "text-sm mt-1",
                isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-orange-600" : "text-muted-foreground"
              )}>
                {isOverdue ? `Просрочено ${Math.abs(daysLeft)} дней` : `Осталось ${daysLeft} дней`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Финансовые показатели</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Проценты</div>
                <div className="text-2xl font-bold text-orange-600">{formatMoney(investment.interest_amount)}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Всего к возврату</div>
                <div className="text-2xl font-bold">{formatMoney(investment.total_return_amount)}</div>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="text-sm text-muted-foreground">Остаток к получению</div>
                <div className="text-2xl font-bold text-primary">{formatMoney(totalRemaining)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс возврата</span>
                <span className="font-medium">{Math.round(paidPercent)}%</span>
              </div>
              <Progress value={paidPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Возвращено: {formatMoney(investment.returned_principal + investment.returned_interest)}</span>
                <span>Осталось: {formatMoney(totalRemaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        {canViewFinancials && (
          <Card>
            <CardHeader>
              <CardTitle>История операций</CardTitle>
              <CardDescription>Движение средств по инвестиции</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Операций пока нет</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип операции</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.transaction_date).toLocaleDateString("ru-RU")}</TableCell>
                        <TableCell>{transactionTypeLabels[tx.transaction_type] || tx.transaction_type}</TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          tx.transaction_type === "receipt" ? "text-green-600" : "text-orange-600"
                        )}>
                          {tx.transaction_type === "receipt" ? "+" : "−"}{formatMoney(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Дата договора</span>
                <span>{new Date(investment.investment_date).toLocaleDateString("ru-RU")}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Срок</span>
                <span>{investment.period_days} дней</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Процентная ставка</span>
                <span>{investment.interest_rate}% ({INTEREST_TYPE_LABELS[investment.interest_type]})</span>
              </div>
              {investment.purpose && (
                <div className="flex justify-between py-2 border-b md:col-span-2">
                  <span className="text-muted-foreground">Назначение</span>
                  <span>{investment.purpose}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
