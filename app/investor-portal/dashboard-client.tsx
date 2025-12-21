"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  FileText,
} from "lucide-react";

interface Investment {
  id: string;
  investment_number: string;
  approved_amount: number;
  total_return_amount: number;
  returned_principal: number;
  returned_interest: number;
  status: string;
  due_date: string;
  source?: { id: string; name: string; source_type: string } | null;
  tender?: { id: string; subject: string; purchase_number: string; status: string } | null;
}

interface UpcomingPayment {
  id: string;
  investment_number: string;
  amount: number;
  due_date: string;
  tender_subject: string;
}

interface Stats {
  totalInvested: number;
  totalToReturn: number;
  totalReturned: number;
  activeCount: number;
  overdueCount: number;
}

interface InvestorPortalDashboardProps {
  stats: Stats;
  activeInvestments: Investment[];
  upcomingPayments: UpcomingPayment[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function InvestorPortalDashboard({
  stats,
  activeInvestments,
  upcomingPayments,
}: InvestorPortalDashboardProps) {
  const returnProgress = stats.totalToReturn > 0
    ? Math.round((stats.totalReturned / stats.totalToReturn) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Добро пожаловать в портал</h1>
        <p className="text-muted-foreground">
          Управляйте своими инвестициями и отслеживайте доходность
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Всего инвестировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.totalInvested)}</div>
            <p className="text-xs opacity-80 mt-1">
              {stats.activeCount} активных инвестиций
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ожидаемый доход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(stats.totalToReturn - stats.totalInvested)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              К возврату: {formatMoney(stats.totalToReturn)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Уже возвращено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.totalReturned)}</div>
            <p className="text-xs opacity-80 mt-1">{returnProgress}% от общей суммы</p>
          </CardContent>
        </Card>

        <Card className={stats.overdueCount > 0 
          ? "bg-gradient-to-br from-red-500 to-red-600 text-white border-0"
          : "bg-gradient-to-br from-slate-500 to-slate-600 text-white border-0"
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Просроченные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueCount}</div>
            <p className="text-xs opacity-80 mt-1">
              {stats.overdueCount === 0 ? "Нет просрочек" : "Требуют внимания"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Общий прогресс возврата
          </CardTitle>
          <CardDescription>
            Возвращено {formatMoney(stats.totalReturned)} из {formatMoney(stats.totalToReturn)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс</span>
              <span className="font-medium">{returnProgress}%</span>
            </div>
            <Progress value={returnProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Two columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Ближайшие платежи
              </CardTitle>
              <Link
                href="/investor-portal/schedule"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Все <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Нет предстоящих платежей
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.map((payment) => {
                  const daysUntil = getDaysUntil(payment.due_date);
                  const isUrgent = daysUntil <= 7;
                  const isOverdue = daysUntil < 0;

                  return (
                    <Link
                      key={payment.id}
                      href={`/investor-portal/investments/${payment.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {payment.investment_number}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {payment.tender_subject}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-sm">
                          {formatMoney(payment.amount)}
                        </p>
                        <Badge
                          variant={isOverdue ? "destructive" : isUrgent ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {isOverdue
                            ? `Просрочено ${Math.abs(daysUntil)} дн.`
                            : `Через ${daysUntil} дн.`}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Investments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-500" />
                Активные инвестиции
              </CardTitle>
              <Link
                href="/investor-portal/investments"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Все <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeInvestments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Нет активных инвестиций
              </p>
            ) : (
              <div className="space-y-3">
                {activeInvestments.slice(0, 5).map((inv) => {
                  const progress = inv.total_return_amount > 0
                    ? Math.round(((inv.returned_principal || 0) + (inv.returned_interest || 0)) / inv.total_return_amount * 100)
                    : 0;

                  return (
                    <Link
                      key={inv.id}
                      href={`/investor-portal/investments/${inv.id}`}
                      className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{inv.investment_number}</p>
                        <Badge variant="secondary">{inv.source?.name || "—"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {inv.tender?.subject || "Без тендера"}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Возврат</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link
              href="/investor-portal/investments"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <Wallet className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Мои инвестиции</p>
                <p className="text-xs text-muted-foreground">Просмотр всех</p>
              </div>
            </Link>

            <Link
              href="/investor-portal/schedule"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">График платежей</p>
                <p className="text-xs text-muted-foreground">Календарь возвратов</p>
              </div>
            </Link>

            <Link
              href="/investor-portal/documents"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Документы</p>
                <p className="text-xs text-muted-foreground">Договоры и акты</p>
              </div>
            </Link>

            <Link
              href="/investor-portal/analytics"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="font-medium">Аналитика</p>
                <p className="text-xs text-muted-foreground">Доходность и статистика</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
