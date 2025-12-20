"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Scale, TrendingUp, TrendingDown } from "lucide-react";

interface BalanceData {
  period: string;
  assets: {
    fixed_assets: number;
    intangible_assets: number;
    long_term_investments: number;
    total_non_current: number;
    inventory: number;
    receivables: number;
    cash: number;
    other_current: number;
    total_current: number;
    total_assets: number;
  };
  liabilities: {
    charter_capital: number;
    retained_earnings: number;
    total_equity: number;
    long_term_loans: number;
    total_long_term: number;
    short_term_loans: number;
    payables: number;
    other_short_term: number;
    total_short_term: number;
    total_liabilities: number;
  };
}

interface Props {
  data: BalanceData;
  prevData?: BalanceData;
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

const BalanceRow = ({ label, value, prevValue, level = 0 }: { label: string; value: number; prevValue?: number; level?: number }) => {
  const change = prevValue ? value - prevValue : 0;
  return (
    <div className={`flex justify-between items-center py-1 ${level === 0 ? "font-medium" : level === 2 ? "pl-4 text-sm text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <span className="font-mono w-32 text-right">{formatMoney(value)}</span>
        {prevValue !== undefined && (
          <span className={`font-mono w-28 text-right text-sm ${change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {change !== 0 && (change > 0 ? "+" : "")}{formatMoney(change)}
          </span>
        )}
      </div>
    </div>
  );
};

export function BalanceSheetPage({ data, prevData }: Props) {
  const isBalanced = Math.abs(data.assets.total_assets - data.liabilities.total_liabilities) < 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Бухгалтерский баланс</h1>
          <p className="text-muted-foreground">{data.period}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="current">
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">На текущую дату</SelectItem>
              <SelectItem value="quarter">На конец квартала</SelectItem>
              <SelectItem value="year">На конец года</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Экспорт</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Активы</div><div className="text-2xl font-bold">{formatMoney(data.assets.total_assets)} ₽</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-lg"><TrendingDown className="h-6 w-6 text-emerald-600" /></div><div><div className="text-sm text-muted-foreground">Пассивы</div><div className="text-2xl font-bold">{formatMoney(data.liabilities.total_liabilities)} ₽</div></div></div></CardContent></Card>
        <Card className={isBalanced ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}><CardContent className="pt-6"><div className="flex items-center gap-4"><div className={`p-3 rounded-lg ${isBalanced ? "bg-emerald-100" : "bg-red-100"}`}><Scale className={`h-6 w-6 ${isBalanced ? "text-emerald-600" : "text-red-600"}`} /></div><div><div className="text-sm text-muted-foreground">Баланс</div><div className={`text-2xl font-bold ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>{isBalanced ? "Сходится" : "Расхождение"}</div></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2 text-blue-600"><TrendingUp className="h-4 w-4" />АКТИВ</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="font-medium text-sm text-muted-foreground mb-2">I. ВНЕОБОРОТНЫЕ АКТИВЫ</div>
            <BalanceRow label="Основные средства" value={data.assets.fixed_assets} prevValue={prevData?.assets.fixed_assets} level={2} />
            <BalanceRow label="Нематериальные активы" value={data.assets.intangible_assets} prevValue={prevData?.assets.intangible_assets} level={2} />
            <BalanceRow label="Финансовые вложения" value={data.assets.long_term_investments} prevValue={prevData?.assets.long_term_investments} level={2} />
            <Separator className="my-2" />
            <BalanceRow label="Итого по разделу I" value={data.assets.total_non_current} prevValue={prevData?.assets.total_non_current} />
            <div className="font-medium text-sm text-muted-foreground mb-2 mt-4">II. ОБОРОТНЫЕ АКТИВЫ</div>
            <BalanceRow label="Запасы" value={data.assets.inventory} prevValue={prevData?.assets.inventory} level={2} />
            <BalanceRow label="Дебиторская задолженность" value={data.assets.receivables} prevValue={prevData?.assets.receivables} level={2} />
            <BalanceRow label="Денежные средства" value={data.assets.cash} prevValue={prevData?.assets.cash} level={2} />
            <BalanceRow label="Прочие оборотные активы" value={data.assets.other_current} prevValue={prevData?.assets.other_current} level={2} />
            <Separator className="my-2" />
            <BalanceRow label="Итого по разделу II" value={data.assets.total_current} prevValue={prevData?.assets.total_current} />
            <Separator className="my-2" />
            <BalanceRow label="БАЛАНС (АКТИВ)" value={data.assets.total_assets} prevValue={prevData?.assets.total_assets} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2 text-emerald-600"><TrendingDown className="h-4 w-4" />ПАССИВ</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="font-medium text-sm text-muted-foreground mb-2">III. КАПИТАЛ И РЕЗЕРВЫ</div>
            <BalanceRow label="Уставный капитал" value={data.liabilities.charter_capital} prevValue={prevData?.liabilities.charter_capital} level={2} />
            <BalanceRow label="Нераспределённая прибыль" value={data.liabilities.retained_earnings} prevValue={prevData?.liabilities.retained_earnings} level={2} />
            <Separator className="my-2" />
            <BalanceRow label="Итого по разделу III" value={data.liabilities.total_equity} prevValue={prevData?.liabilities.total_equity} />
            <div className="font-medium text-sm text-muted-foreground mb-2 mt-4">IV. ДОЛГОСРОЧНЫЕ ОБЯЗАТЕЛЬСТВА</div>
            <BalanceRow label="Заёмные средства" value={data.liabilities.long_term_loans} prevValue={prevData?.liabilities.long_term_loans} level={2} />
            <Separator className="my-2" />
            <BalanceRow label="Итого по разделу IV" value={data.liabilities.total_long_term} prevValue={prevData?.liabilities.total_long_term} />
            <div className="font-medium text-sm text-muted-foreground mb-2 mt-4">V. КРАТКОСРОЧНЫЕ ОБЯЗАТЕЛЬСТВА</div>
            <BalanceRow label="Заёмные средства" value={data.liabilities.short_term_loans} prevValue={prevData?.liabilities.short_term_loans} level={2} />
            <BalanceRow label="Кредиторская задолженность" value={data.liabilities.payables} prevValue={prevData?.liabilities.payables} level={2} />
            <BalanceRow label="Прочие обязательства" value={data.liabilities.other_short_term} prevValue={prevData?.liabilities.other_short_term} level={2} />
            <Separator className="my-2" />
            <BalanceRow label="Итого по разделу V" value={data.liabilities.total_short_term} prevValue={prevData?.liabilities.total_short_term} />
            <Separator className="my-2" />
            <BalanceRow label="БАЛАНС (ПАССИВ)" value={data.liabilities.total_liabilities} prevValue={prevData?.liabilities.total_liabilities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
