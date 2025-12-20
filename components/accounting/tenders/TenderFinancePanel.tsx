"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatMoney } from "@/lib/accounting/types";
import {
  TenderBudget,
  TenderPaymentStage,
  TenderGuarantee,
  guaranteeTypeLabels,
  budgetCategoryLabels,
  BudgetCategory,
} from "@/lib/accounting/tenders/types";

interface TenderFinancePanelProps {
  tenderId?: string;
  budget?: TenderBudget | null;
  paymentStages: TenderPaymentStage[];
  guarantees: TenderGuarantee[];
  onRefresh?: () => void;
  onCreateBudget?: () => void;
  onCreatePaymentStage?: () => void;
  onCreateGuarantee?: () => void;
}

export function TenderFinancePanel({
  budget,
  paymentStages,
  guarantees,
  onRefresh,
  onCreateBudget,
  onCreatePaymentStage,
  onCreateGuarantee,
}: TenderFinancePanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Расчёт показателей бюджета
  const budgetMetrics = budget ? {
    plannedMargin: budget.planned_revenue > 0 
      ? ((budget.planned_profit / budget.planned_revenue) * 100).toFixed(1) 
      : "0",
    actualMargin: budget.actual_revenue > 0 
      ? ((budget.actual_profit / budget.actual_revenue) * 100).toFixed(1) 
      : "0",
    executionPercent: budget.planned_total_expense > 0 
      ? Math.min(100, (budget.actual_expense / budget.planned_total_expense) * 100) 
      : 0,
    revenuePercent: budget.planned_revenue > 0 
      ? Math.min(100, (budget.actual_revenue / budget.planned_revenue) * 100) 
      : 0,
  } : null;

  // Расчёт показателей оплаты
  const totalAmount = paymentStages.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = paymentStages.reduce((sum, s) => sum + s.paid_amount, 0);
  const paymentMetrics = {
    totalAmount,
    paidAmount,
    pendingCount: paymentStages.filter(s => ["pending", "invoiced"].includes(s.status)).length,
    overdueCount: paymentStages.filter(s => s.status === "overdue").length,
    paidPercent: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
  };

  // Расчёт показателей гарантий
  const guaranteeMetrics = {
    totalAmount: guarantees.reduce((sum, g) => sum + g.amount, 0),
    activeCount: guarantees.filter(g => g.status === "active").length,
    expiringCount: guarantees.filter(g => {
      const daysUntilExpiry = Math.ceil(
        (new Date(g.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return g.status === "active" && daysUntilExpiry <= 30;
    }).length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          Финансы тендера
        </CardTitle>
        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="budget">Бюджет</TabsTrigger>
            <TabsTrigger value="payments">Оплаты</TabsTrigger>
            <TabsTrigger value="guarantees">Гарантии</TabsTrigger>
          </TabsList>

          {/* Обзор */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Плановая прибыль */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                <div className="text-xs text-green-600 mb-1">План. прибыль</div>
                <div className="text-lg font-bold text-green-700">
                  {budget ? formatMoney(budget.planned_profit) : "—"}
                </div>
                {budgetMetrics && (
                  <div className="text-xs text-green-600">
                    Маржа {budgetMetrics.plannedMargin}%
                  </div>
                )}
              </div>

              {/* Факт. прибыль */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="text-xs text-blue-600 mb-1">Факт. прибыль</div>
                <div className="text-lg font-bold text-blue-700">
                  {budget ? formatMoney(budget.actual_profit) : "—"}
                </div>
                {budgetMetrics && (
                  <div className="text-xs text-blue-600">
                    Маржа {budgetMetrics.actualMargin}%
                  </div>
                )}
              </div>

              {/* Оплачено */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                <div className="text-xs text-purple-600 mb-1">Оплачено</div>
                <div className="text-lg font-bold text-purple-700">
                  {formatMoney(paymentMetrics.paidAmount)}
                </div>
                <div className="text-xs text-purple-600">
                  из {formatMoney(paymentMetrics.totalAmount)}
                </div>
              </div>

              {/* Гарантии */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                <div className="text-xs text-amber-600 mb-1">Гарантии</div>
                <div className="text-lg font-bold text-amber-700">
                  {formatMoney(guaranteeMetrics.totalAmount)}
                </div>
                <div className="text-xs text-amber-600">
                  {guaranteeMetrics.activeCount} активных
                </div>
              </div>
            </div>

            {/* Предупреждения */}
            {(paymentMetrics.overdueCount > 0 || guaranteeMetrics.expiringCount > 0) && (
              <div className="space-y-2">
                {paymentMetrics.overdueCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-red-50 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {paymentMetrics.overdueCount} просроченных платежей
                  </div>
                )}
                {guaranteeMetrics.expiringCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-50 text-amber-700 text-sm">
                    <Clock className="h-4 w-4" />
                    {guaranteeMetrics.expiringCount} гарантий истекают в ближайшие 30 дней
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Бюджет */}
          <TabsContent value="budget" className="space-y-4 mt-4">
            {budget ? (
              <>
                {/* Прогресс исполнения */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Исполнение расходов</span>
                    <span>{budgetMetrics?.executionPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={budgetMetrics?.executionPercent || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Получение доходов</span>
                    <span>{budgetMetrics?.revenuePercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={budgetMetrics?.revenuePercent || 0} className="h-2 bg-green-100" />
                </div>

                {/* Структура расходов */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Структура расходов</div>
                  {(["materials", "labor", "subcontractors", "transport", "overhead", "other"] as BudgetCategory[]).map((cat) => {
                    const planned = budget[`planned_${cat}` as keyof TenderBudget] as number || 0;
                    if (planned === 0) return null;
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{budgetCategoryLabels[cat]}</span>
                        <span>{formatMoney(planned)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Итоги */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>Плановые расходы</span>
                    <span className="font-medium text-red-600">
                      {formatMoney(budget.planned_total_expense)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Плановые доходы</span>
                    <span className="font-medium text-green-600">
                      {formatMoney(budget.planned_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Плановая прибыль</span>
                    <span className={budget.planned_profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatMoney(budget.planned_profit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Бюджет не создан</p>
                {onCreateBudget && (
                  <Button onClick={onCreateBudget}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать бюджет
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Оплаты */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            {paymentStages.length > 0 ? (
              <>
                {/* Прогресс оплаты */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Оплачено</span>
                    <span>{paymentMetrics.paidPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={paymentMetrics.paidPercent} className="h-2" />
                </div>

                {/* Список этапов */}
                <div className="space-y-2">
                  {paymentStages.map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div>
                        <div className="font-medium text-sm">{stage.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {stage.planned_date && `План: ${new Date(stage.planned_date).toLocaleDateString("ru-RU")}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatMoney(stage.amount)}</div>
                        <Badge
                          variant={
                            stage.status === "paid" ? "default" :
                            stage.status === "overdue" ? "destructive" :
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {stage.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {stage.status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {stage.status === "pending" && "Ожидание"}
                          {stage.status === "invoiced" && "Выставлен счёт"}
                          {stage.status === "partial" && "Частично"}
                          {stage.status === "paid" && "Оплачено"}
                          {stage.status === "overdue" && "Просрочено"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {onCreatePaymentStage && (
                  <Button variant="outline" className="w-full" onClick={onCreatePaymentStage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить этап
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Этапы оплаты не созданы</p>
                {onCreatePaymentStage && (
                  <Button onClick={onCreatePaymentStage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить этап
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Гарантии */}
          <TabsContent value="guarantees" className="space-y-4 mt-4">
            {guarantees.length > 0 ? (
              <>
                {/* Список гарантий */}
                <div className="space-y-2">
                  {guarantees.map((guarantee) => {
                    const daysUntilExpiry = Math.ceil(
                      (new Date(guarantee.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isExpiring = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                    const isExpired = daysUntilExpiry <= 0;

                    return (
                      <div
                        key={guarantee.id}
                        className={`p-3 rounded border ${
                          isExpired ? "border-red-200 bg-red-50" :
                          isExpiring ? "border-amber-200 bg-amber-50" :
                          ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              {guaranteeTypeLabels[guarantee.guarantee_type]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              до {new Date(guarantee.valid_until).toLocaleDateString("ru-RU")}
                              {isExpiring && ` (${daysUntilExpiry} дн.)`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatMoney(guarantee.amount)}</div>
                            <Badge
                              variant={
                                guarantee.status === "active" ? "default" :
                                guarantee.status === "returned" ? "secondary" :
                                guarantee.status === "expired" ? "destructive" :
                                "outline"
                              }
                              className="text-xs"
                            >
                              {guarantee.status === "pending" && "Ожидание"}
                              {guarantee.status === "active" && "Активна"}
                              {guarantee.status === "returned" && "Возвращена"}
                              {guarantee.status === "expired" && "Истекла"}
                              {guarantee.status === "claimed" && "Востребована"}
                            </Badge>
                          </div>
                        </div>
                        {guarantee.bank_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {guarantee.bank_name} {guarantee.guarantee_number && `№${guarantee.guarantee_number}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {onCreateGuarantee && (
                  <Button variant="outline" className="w-full" onClick={onCreateGuarantee}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить гарантию
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Гарантии не добавлены</p>
                {onCreateGuarantee && (
                  <Button onClick={onCreateGuarantee}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить гарантию
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
