"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, TrendingUp, TrendingDown, BarChart3, Percent } from "lucide-react";

interface TenderPLData {
  tender_id: string;
  tender_name: string;
  contract_number: string;
  contract_date: string;
  customer_name: string;
  
  revenue: {
    contract_amount: number;
    received: number;
    pending: number;
    additional_works: number;
  };
  
  costs: {
    materials: number;
    subcontractors: number;
    labor: number;
    transport: number;
    overhead: number;
    other: number;
    total: number;
  };
  
  penalties: {
    incoming: number;
    outgoing: number;
  };
  
  guarantees: {
    active_amount: number;
    cost: number;
  };
}

interface TenderPLReportPageProps {
  data: TenderPLData;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function TenderPLReportPage({ data }: TenderPLReportPageProps) {
  const totalRevenue = data.revenue.contract_amount + data.revenue.additional_works + data.penalties.incoming;
  const totalCosts = data.costs.total + data.penalties.outgoing + data.guarantees.cost;
  const grossProfit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const isProfitable = grossProfit > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L по тендеру</h1>
          <p className="text-muted-foreground">{data.tender_name}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Сумма контракта</div>
            <div className="text-2xl font-bold">{formatMoney(data.revenue.contract_amount)} ₽</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Затраты</div>
            <div className="text-2xl font-bold text-red-600">{formatMoney(totalCosts)} ₽</div>
          </CardContent>
        </Card>
        <Card className={isProfitable ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              {isProfitable ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              Прибыль / Убыток
            </div>
            <div className={`text-2xl font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>
              {isProfitable ? "+" : ""}{formatMoney(grossProfit)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Маржинальность
            </div>
            <div className={`text-2xl font-bold ${margin >= 15 ? "text-emerald-600" : margin >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {margin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              Доходы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сумма контракта</span>
              <span className="font-mono">{formatMoney(data.revenue.contract_amount)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доп. работы</span>
              <span className="font-mono">{formatMoney(data.revenue.additional_works)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Штрафы полученные</span>
              <span className="font-mono">{formatMoney(data.penalties.incoming)} ₽</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Итого доходы</span>
              <span className="font-mono text-emerald-600">{formatMoney(totalRevenue)} ₽</span>
            </div>
            <div className="pt-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Получено</span>
                <span>{formatMoney(data.revenue.received)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Ожидается</span>
                <span>{formatMoney(data.revenue.pending)} ₽</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              Расходы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Материалы</span>
              <span className="font-mono">{formatMoney(data.costs.materials)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Субподрядчики</span>
              <span className="font-mono">{formatMoney(data.costs.subcontractors)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ФОТ</span>
              <span className="font-mono">{formatMoney(data.costs.labor)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Транспорт</span>
              <span className="font-mono">{formatMoney(data.costs.transport)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Накладные</span>
              <span className="font-mono">{formatMoney(data.costs.overhead)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Прочие</span>
              <span className="font-mono">{formatMoney(data.costs.other)} ₽</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Штрафы уплаченные</span>
              <span className="font-mono">{formatMoney(data.penalties.outgoing)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Стоимость гарантий</span>
              <span className="font-mono">{formatMoney(data.guarantees.cost)} ₽</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Итого расходы</span>
              <span className="font-mono text-red-600">{formatMoney(totalCosts)} ₽</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Финансовый результат
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-600">
                {formatMoney(totalRevenue)} ₽
              </div>
              <div className="text-sm text-muted-foreground">Доходы</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">
                {formatMoney(totalCosts)} ₽
              </div>
              <div className="text-sm text-muted-foreground">Расходы</div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>
                {isProfitable ? "+" : ""}{formatMoney(grossProfit)} ₽
              </div>
              <div className="text-sm text-muted-foreground">
                Прибыль ({margin.toFixed(1)}%)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
