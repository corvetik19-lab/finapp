"use client";

import { CalendarClock, AlertTriangle, Clock } from "lucide-react";
import type { Investment } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReturnsPageProps {
  investments: Investment[];
}

export function ReturnsPage({ investments }: ReturnsPageProps) {
  const activeInvestments = investments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );

  const groupedByMonth: Record<string, Investment[]> = {};
  activeInvestments.forEach((inv) => {
    const month = inv.due_date.substring(0, 7);
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(inv);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();
  const today = new Date();

  const overdueInvestments = activeInvestments.filter(
    (i) => new Date(i.due_date) < today && i.status !== "completed"
  );
  const upcomingInvestments = activeInvestments.filter((i) => {
    const dueDate = new Date(i.due_date);
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  });

  const totalOverdue = overdueInvestments.reduce(
    (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0
  );
  const totalUpcoming = upcomingInvestments.reduce(
    (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0
  );

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", requested: "outline", approved: "default", received: "default",
    in_progress: "default", returning: "outline", completed: "secondary", overdue: "destructive", cancelled: "secondary",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">График возвратов</h1>
        <p className="text-muted-foreground">Календарь платежей инвесторам</p>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
              <div className="text-2xl font-bold text-destructive">{formatMoney(totalOverdue)}</div>
              <div className="text-xs text-muted-foreground">{overdueInvestments.length} инвестиций</div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-orange-500/50 bg-orange-50">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <CardTitle className="text-sm font-medium">В ближайшие 30 дней</CardTitle>
              <div className="text-2xl font-bold text-orange-600">{formatMoney(totalUpcoming)}</div>
              <div className="text-xs text-muted-foreground">{upcomingInvestments.length} инвестиций</div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Календарь по месяцам */}
      {sortedMonths.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Нет предстоящих возвратов</h3>
          <p className="text-muted-foreground text-sm">Все инвестиции закрыты</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map((month) => {
            const monthInvestments = groupedByMonth[month];
            const monthTotal = monthInvestments.reduce(
              (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0
            );
            const monthDate = new Date(month + "-01");
            const monthName = monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
            const isPast = monthDate < new Date(today.getFullYear(), today.getMonth(), 1);

            return (
              <Card key={month} className={cn(isPast && "opacity-60")}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="capitalize">{monthName}</CardTitle>
                  <span className="font-bold">{formatMoney(monthTotal)}</span>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {monthInvestments
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .map((inv) => {
                        const remaining = inv.total_return_amount - inv.returned_principal - inv.returned_interest;
                        const dueDate = new Date(inv.due_date);
                        const isOverdue = dueDate < today && inv.status !== "completed";
                        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

                        return (
                          <div
                            key={inv.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              isOverdue ? "bg-destructive/10" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[50px]">
                                <div className="text-2xl font-bold">{dueDate.getDate()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {dueDate.toLocaleDateString("ru-RU", { weekday: "short" })}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">{inv.investment_number}</div>
                                <div className="text-sm text-muted-foreground">{inv.source?.name || "—"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold">{formatMoney(remaining)}</div>
                                <div className={cn(
                                  "text-xs",
                                  isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-orange-600" : "text-muted-foreground"
                                )}>
                                  {isOverdue ? `Просрочено ${Math.abs(daysLeft)} дн.` : `${daysLeft} дн.`}
                                </div>
                              </div>
                              <Badge variant={statusVariants[inv.status] || "secondary"}>
                                {INVESTMENT_STATUS_LABELS[inv.status]}
                              </Badge>
                            </div>
                          </div>
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
