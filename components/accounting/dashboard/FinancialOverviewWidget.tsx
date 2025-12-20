"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { FinancialOverviewData } from "@/lib/accounting/dashboard/types";
import { formatMoney } from "@/lib/accounting/types";

interface FinancialOverviewWidgetProps {
  data: FinancialOverviewData;
}

export function FinancialOverviewWidget({ data }: FinancialOverviewWidgetProps) {
  const stats = [
    {
      label: "Доходы",
      value: data.totalIncome,
      change: data.incomeChange,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Расходы",
      value: data.totalExpense,
      change: data.expenseChange,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Прибыль",
      value: data.profit,
      change: data.profitChange,
      icon: DollarSign,
      color: data.profit >= 0 ? "text-green-600" : "text-red-600",
      bgColor: data.profit >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      label: "Баланс",
      value: data.balance,
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Финансовый обзор
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`p-4 rounded-lg ${stat.bgColor} transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>
                {formatMoney(stat.value)}
              </div>
              {stat.change !== undefined && stat.change !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {stat.change > 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs ${
                      stat.change > 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.profitMargin > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Рентабельность</span>
              <span className="font-semibold text-emerald-600">
                {data.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(data.profitMargin, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
