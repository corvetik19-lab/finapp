"use client";

import Link from "next/link";
import { TrendingUp, Clock, CheckCircle, Building2, FileText } from "lucide-react";
import type { Investment, InvestorAccess } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  accesses: InvestorAccess[];
  investments: Investment[];
}

export function InvestorDashboardClient({ accesses, investments }: Props) {
  const activeInvestments = investments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const completedInvestments = investments.filter((i) => i.status === "completed");

  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
  const totalInterest = activeInvestments.reduce((sum, i) => sum + i.interest_amount, 0);
  const totalReturned = investments.reduce(
    (sum, i) => sum + i.returned_principal + i.returned_interest, 0
  );
  const totalRemaining = activeInvestments.reduce(
    (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0
  );

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", requested: "outline", approved: "default", received: "default",
    in_progress: "default", returning: "outline", completed: "secondary", overdue: "destructive", cancelled: "secondary",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Портал инвестора</h1>
            <p className="text-muted-foreground">
              {accesses.map((a) => a.source?.name).join(", ")}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/investor-portal/login">Выйти</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Активные инвестиции</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalInvested)}</div>
              <p className="text-xs text-muted-foreground">{activeInvestments.length} инвестиций</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Начислено процентов</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatMoney(totalInterest)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Получено возвратов</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatMoney(totalReturned)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">К получению</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalRemaining)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Investments List */}
        <Card>
          <CardHeader>
            <CardTitle>Мои инвестиции</CardTitle>
            <CardDescription>Список всех ваших инвестиций</CardDescription>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>У вас пока нет инвестиций</p>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((inv) => {
                  const paid = inv.returned_principal + inv.returned_interest;
                  const remaining = inv.total_return_amount - paid;
                  const paidPercent = inv.total_return_amount > 0 ? (paid / inv.total_return_amount) * 100 : 0;
                  const dueDate = new Date(inv.due_date);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
                  const isOverdue = daysLeft < 0 && inv.status !== "completed";

                  return (
                    <Link
                      key={inv.id}
                      href={`/investor-portal/investment/${inv.id}`}
                      className="block"
                    >
                      <Card className={cn(
                        "hover:shadow-md transition-shadow",
                        isOverdue && "border-destructive"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold">{inv.investment_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {inv.source?.name} • {inv.interest_rate}% годовых
                              </div>
                            </div>
                            <Badge variant={statusVariants[inv.status] || "secondary"}>
                              {INVESTMENT_STATUS_LABELS[inv.status]}
                            </Badge>
                          </div>

                          <div className="grid gap-3 md:grid-cols-4 text-sm mb-3">
                            <div>
                              <div className="text-muted-foreground">Сумма</div>
                              <div className="font-medium">{formatMoney(inv.approved_amount)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Проценты</div>
                              <div className="font-medium text-orange-600">{formatMoney(inv.interest_amount)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">К возврату</div>
                              <div className="font-medium">{formatMoney(remaining)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Срок</div>
                              <div className={cn(
                                "font-medium",
                                isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-orange-600" : ""
                              )}>
                                {dueDate.toLocaleDateString("ru-RU")}
                                {isOverdue && ` (просрочено ${Math.abs(daysLeft)} дн.)`}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Возвращено</span>
                              <span>{Math.round(paidPercent)}%</span>
                            </div>
                            <Progress value={paidPercent} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
