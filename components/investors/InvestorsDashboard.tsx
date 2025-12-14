"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  Building2,
  FileText,
} from "lucide-react";
import type { Investment, InvestmentSource } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS, SOURCE_TYPE_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InvestorsDashboardProps {
  investments: Investment[];
  sources: InvestmentSource[];
}

export function InvestorsDashboard({ investments, sources }: InvestorsDashboardProps) {
  const activeInvestments = investments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );
  
  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
  const totalToReturn = activeInvestments.reduce((sum, i) => sum + i.total_return_amount, 0);
  const totalReturned = activeInvestments.reduce(
    (sum, i) => sum + i.returned_principal + i.returned_interest,
    0
  );
  const totalOverdue = investments
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0);

  const upcomingReturns = activeInvestments
    .filter((i) => new Date(i.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    requested: "outline",
    approved: "default",
    received: "default",
    in_progress: "default",
    returning: "outline",
    completed: "secondary",
    overdue: "destructive",
    cancelled: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Дашборд инвестиций</h1>
          <p className="text-muted-foreground">Управление финансированием тендеров</p>
        </div>
        <Button asChild>
          <Link href="/investors/investments/new">
            <Plus className="mr-2 h-4 w-4" />
            Новая инвестиция
          </Link>
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Привлечено</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalInvested)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">К возврату</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalToReturn - totalReturned)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Возвращено</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalReturned)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatMoney(totalOverdue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Основной контент */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Активные инвестиции */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Активные инвестиции
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/investors/investments">
                Все <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeInvestments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет активных инвестиций</p>
            ) : (
              <div className="space-y-3">
                {activeInvestments.slice(0, 5).map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/investors/investments/${inv.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="font-medium">{inv.investment_number}</div>
                      <div className="text-sm text-muted-foreground">{inv.source?.name || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(inv.approved_amount)}</div>
                      <Badge variant={statusVariants[inv.status] || "secondary"}>
                        {INVESTMENT_STATUS_LABELS[inv.status]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Источники финансирования */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Источники финансирования
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/investors/sources">
                Все <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">Нет источников</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/investors/sources">Добавить</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.slice(0, 5).map((source) => {
                  const sourceInvestments = investments.filter(
                    (i) => i.source_id === source.id && !["completed", "cancelled"].includes(i.status)
                  );
                  const totalAmount = sourceInvestments.reduce((s, i) => s + i.approved_amount, 0);

                  return (
                    <div key={source.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {SOURCE_TYPE_LABELS[source.source_type]}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatMoney(totalAmount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {sourceInvestments.length} актив.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ближайшие возвраты */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ближайшие возвраты
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/investors/returns">
                График <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingReturns.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет предстоящих возвратов</p>
            ) : (
              <div className="space-y-3">
                {upcomingReturns.map((inv) => {
                  const daysLeft = Math.ceil(
                    (new Date(inv.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const remaining = inv.total_return_amount - inv.returned_principal - inv.returned_interest;

                  return (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{inv.investment_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(inv.due_date).toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatMoney(remaining)}</div>
                        <div className={cn(
                          "text-xs",
                          daysLeft <= 7 ? "text-destructive font-medium" : "text-muted-foreground"
                        )}>
                          {daysLeft} дн.
                        </div>
                      </div>
                    </div>
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
