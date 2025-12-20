"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, BarChart3, Percent } from "lucide-react";

interface PnLData {
  period: string;
  revenue: number;
  cost_of_sales: number;
  gross_profit: number;
  selling_expenses: number;
  admin_expenses: number;
  operating_profit: number;
  interest_income: number;
  interest_expense: number;
  other_income: number;
  other_expense: number;
  profit_before_tax: number;
  income_tax: number;
  net_profit: number;
}

interface Props {
  data: PnLData;
  prevData?: PnLData;
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

const PnLRow = ({ label, value, prevValue, isTotal = false, isNegative = false }: { label: string; value: number; prevValue?: number; isTotal?: boolean; isNegative?: boolean }) => {
  const change = prevValue ? ((value - prevValue) / Math.abs(prevValue)) * 100 : 0;
  return (
    <div className={`flex justify-between items-center py-2 ${isTotal ? "font-medium bg-muted/50 px-2 -mx-2 rounded" : ""}`}>
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <span className={`font-mono w-36 text-right ${isNegative ? "text-red-600" : value < 0 ? "text-red-600" : ""}`}>
          {isNegative && value > 0 ? "(" : ""}{formatMoney(Math.abs(value))}{isNegative && value > 0 ? ")" : ""} ₽
        </span>
        {prevValue !== undefined && change !== 0 && (
          <span className={`font-mono w-20 text-right text-sm ${change > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change > 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

export function FinancialResultsPage({ data, prevData }: Props) {
  const netMargin = data.revenue > 0 ? (data.net_profit / data.revenue) * 100 : 0;
  const isProfitable = data.net_profit > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёт о финансовых результатах</h1>
          <p className="text-muted-foreground">{data.period}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="year">
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="quarter">За квартал</SelectItem>
              <SelectItem value="year">За год</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Экспорт</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" />Выручка</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(data.revenue)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Валовая прибыль</div><div className="text-2xl font-bold">{formatMoney(data.gross_profit)} ₽</div></CardContent></Card>
        <Card className={isProfitable ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1">{isProfitable ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}Чистая прибыль</div><div className={`text-2xl font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(data.net_profit)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Рентабельность</div><div className={`text-2xl font-bold ${netMargin >= 10 ? "text-emerald-600" : netMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>{netMargin.toFixed(1)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Отчёт о прибылях и убытках</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <PnLRow label="Выручка" value={data.revenue} prevValue={prevData?.revenue} isTotal />
          <PnLRow label="Себестоимость продаж" value={data.cost_of_sales} prevValue={prevData?.cost_of_sales} isNegative />
          <Separator className="my-3" />
          <PnLRow label="Валовая прибыль (убыток)" value={data.gross_profit} prevValue={prevData?.gross_profit} isTotal />
          <PnLRow label="Коммерческие расходы" value={data.selling_expenses} prevValue={prevData?.selling_expenses} isNegative />
          <PnLRow label="Управленческие расходы" value={data.admin_expenses} prevValue={prevData?.admin_expenses} isNegative />
          <Separator className="my-3" />
          <PnLRow label="Прибыль (убыток) от продаж" value={data.operating_profit} prevValue={prevData?.operating_profit} isTotal />
          <PnLRow label="Проценты к получению" value={data.interest_income} prevValue={prevData?.interest_income} />
          <PnLRow label="Проценты к уплате" value={data.interest_expense} prevValue={prevData?.interest_expense} isNegative />
          <PnLRow label="Прочие доходы" value={data.other_income} prevValue={prevData?.other_income} />
          <PnLRow label="Прочие расходы" value={data.other_expense} prevValue={prevData?.other_expense} isNegative />
          <Separator className="my-3" />
          <PnLRow label="Прибыль (убыток) до налогообложения" value={data.profit_before_tax} prevValue={prevData?.profit_before_tax} isTotal />
          <PnLRow label="Налог на прибыль" value={data.income_tax} prevValue={prevData?.income_tax} isNegative />
          <Separator className="my-3" />
          <div className={`flex justify-between items-center py-3 px-3 -mx-3 rounded-lg ${isProfitable ? "bg-emerald-100" : "bg-red-100"}`}>
            <span className="font-bold text-lg">Чистая прибыль (убыток)</span>
            <span className={`font-mono text-xl font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(data.net_profit)} ₽</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
