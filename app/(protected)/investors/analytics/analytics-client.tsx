"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Building2,
  Calendar,
  Percent,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/investors/calculations";
import {
  SOURCE_TYPE_LABELS,
  INVESTMENT_STATUS_LABELS,
} from "@/lib/investors/types";
import type { Investment, InvestmentSource, SourceType, InvestmentStatus } from "@/lib/investors/types";

interface InvestorAnalyticsClientProps {
  investments: Investment[];
  sources: InvestmentSource[];
}

export function InvestorAnalyticsClient({ investments, sources }: InvestorAnalyticsClientProps) {
  const analytics = useMemo(() => {
    const activeInvestments = investments.filter(
      (i) => !["completed", "cancelled"].includes(i.status)
    );

    const totalInvested = activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
    const totalInterest = activeInvestments.reduce((sum, i) => sum + i.interest_amount, 0);
    const totalReturned = investments.reduce(
      (sum, i) => sum + i.returned_principal + i.returned_interest,
      0
    );
    const totalPending = activeInvestments.reduce(
      (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest,
      0
    );

    const avgInterestRate =
      activeInvestments.length > 0
        ? activeInvestments.reduce((sum, i) => sum + i.interest_rate, 0) / activeInvestments.length
        : 0;

    const avgPeriodDays =
      activeInvestments.length > 0
        ? activeInvestments.reduce((sum, i) => sum + i.period_days, 0) / activeInvestments.length
        : 0;

    // По источникам
    const bySource = sources.map((source) => {
      const sourceInvestments = investments.filter((i) => i.source_id === source.id);
      const activeCount = sourceInvestments.filter(
        (i) => !["completed", "cancelled"].includes(i.status)
      ).length;
      const totalAmount = sourceInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
      const totalInterestAmount = sourceInvestments.reduce((sum, i) => sum + i.interest_amount, 0);
      const avgRate =
        sourceInvestments.length > 0
          ? sourceInvestments.reduce((sum, i) => sum + i.interest_rate, 0) / sourceInvestments.length
          : 0;

      return {
        source,
        investmentsCount: sourceInvestments.length,
        activeCount,
        totalAmount,
        totalInterestAmount,
        avgRate,
      };
    }).filter((s) => s.investmentsCount > 0);

    // По типам источников
    const bySourceType: Record<string, { count: number; amount: number; avgRate: number }> = {};
    investments.forEach((inv) => {
      const source = sources.find((s) => s.id === inv.source_id);
      if (source) {
        const type = source.source_type;
        if (!bySourceType[type]) {
          bySourceType[type] = { count: 0, amount: 0, avgRate: 0 };
        }
        bySourceType[type].count++;
        bySourceType[type].amount += inv.approved_amount;
        bySourceType[type].avgRate += inv.interest_rate;
      }
    });
    Object.keys(bySourceType).forEach((type) => {
      bySourceType[type].avgRate /= bySourceType[type].count || 1;
    });

    // По статусам
    const byStatus: Record<string, { count: number; amount: number }> = {};
    investments.forEach((inv) => {
      if (!byStatus[inv.status]) {
        byStatus[inv.status] = { count: 0, amount: 0 };
      }
      byStatus[inv.status].count++;
      byStatus[inv.status].amount += inv.approved_amount;
    });

    // По месяцам (последние 12 месяцев)
    const monthlyData: { month: string; received: number; returned: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });

      const received = investments
        .filter((inv) => inv.investment_date.startsWith(monthKey))
        .reduce((sum, inv) => sum + inv.approved_amount, 0);

      monthlyData.push({
        month: monthName,
        received,
        returned: 0,
      });
    }

    return {
      totalInvested,
      totalInterest,
      totalReturned,
      totalPending,
      avgInterestRate,
      avgPeriodDays,
      bySource,
      bySourceType,
      byStatus,
      monthlyData,
      activeCount: activeInvestments.length,
      completedCount: investments.filter((i) => i.status === "completed").length,
      overdueCount: investments.filter((i) => i.status === "overdue").length,
    };
  }, [investments, sources]);

  const maxSourceAmount = Math.max(...analytics.bySource.map((s) => s.totalAmount), 1);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Аналитика инвестиций
        </h1>
        <p className="text-muted-foreground">
          Детальный анализ финансирования и источников
        </p>
      </div>

      {/* Ключевые показатели */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего привлечено</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(analytics.totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeCount} активных инвестиций
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">К возврату</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(analytics.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Включая {formatMoney(analytics.totalInterest)} процентов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Средняя ставка</CardTitle>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.avgInterestRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Средний срок: {Math.round(analytics.avgPeriodDays)} дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Возвращено</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(analytics.totalReturned)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedCount} завершённых
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* По типам источников */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              По типам источников
            </CardTitle>
            <CardDescription>Распределение инвестиций по типам</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(analytics.bySourceType).map(([type, data]) => {
              const percentage = (data.amount / analytics.totalInvested) * 100 || 0;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {SOURCE_TYPE_LABELS[type as SourceType] || type}
                    </span>
                    <span>
                      {formatMoney(data.amount)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{data.count} инвестиций</span>
                    <span>Ср. ставка: {data.avgRate.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
            {Object.keys(analytics.bySourceType).length === 0 && (
              <p className="text-center text-muted-foreground py-8">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* По статусам */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              По статусам
            </CardTitle>
            <CardDescription>Распределение по текущему статусу</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(analytics.byStatus).map(([status, data]) => {
              const percentage = (data.amount / analytics.totalInvested) * 100 || 0;
              const statusColors: Record<string, string> = {
                draft: "bg-gray-500",
                requested: "bg-yellow-500",
                approved: "bg-blue-500",
                received: "bg-green-500",
                in_progress: "bg-purple-500",
                returning: "bg-orange-500",
                completed: "bg-emerald-500",
                overdue: "bg-red-500",
                cancelled: "bg-gray-400",
              };
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusColors[status] || "bg-gray-500"}`} />
                      {INVESTMENT_STATUS_LABELS[status as InvestmentStatus] || status}
                    </span>
                    <span>{formatMoney(data.amount)}</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${status === "overdue" ? "[&>div]:bg-red-500" : ""}`} 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{data.count} инвестиций</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Рейтинг источников */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Рейтинг источников финансирования
          </CardTitle>
          <CardDescription>
            Сравнение источников по объёму и условиям
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.bySource
              .sort((a, b) => b.totalAmount - a.totalAmount)
              .map((item, index) => (
                <div key={item.source.id} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{item.source.name}</span>
                      <span className="font-bold">{formatMoney(item.totalAmount)}</span>
                    </div>
                    <Progress
                      value={(item.totalAmount / maxSourceAmount) * 100}
                      className="h-2"
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>
                        <Badge variant="outline" className="mr-2">
                          {SOURCE_TYPE_LABELS[item.source.source_type]}
                        </Badge>
                        {item.investmentsCount} инвест. ({item.activeCount} акт.)
                      </span>
                      <span>Ср. ставка: {item.avgRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            {analytics.bySource.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Нет данных об источниках
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Помесячная динамика */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика привлечения (12 месяцев)</CardTitle>
          <CardDescription>Объём привлечённых инвестиций по месяцам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {analytics.monthlyData.map((month, i) => {
              const maxMonthly = Math.max(...analytics.monthlyData.map((m) => m.received), 1);
              const height = (month.received / maxMonthly) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={formatMoney(month.received)}
                  />
                  <span className="text-xs text-muted-foreground rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {month.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
