"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react";

interface CashFlowData {
  period: string;
  operating: {
    receipts_from_customers: number;
    payments_to_suppliers: number;
    payments_to_employees: number;
    tax_payments: number;
    other_receipts: number;
    other_payments: number;
  };
  investing: {
    fixed_assets_purchase: number;
    fixed_assets_sale: number;
    investments: number;
    dividends_received: number;
  };
  financing: {
    loans_received: number;
    loans_repaid: number;
    dividends_paid: number;
    capital_contributions: number;
  };
  opening_balance: number;
  closing_balance: number;
}

interface Props {
  data: CashFlowData;
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

export function CashFlowReportPage({ data }: Props) {
  const operatingNet = 
    data.operating.receipts_from_customers + data.operating.other_receipts -
    data.operating.payments_to_suppliers - data.operating.payments_to_employees -
    data.operating.tax_payments - data.operating.other_payments;

  const investingNet =
    data.investing.fixed_assets_sale + data.investing.dividends_received -
    data.investing.fixed_assets_purchase - data.investing.investments;

  const financingNet =
    data.financing.loans_received + data.financing.capital_contributions -
    data.financing.loans_repaid - data.financing.dividends_paid;

  const totalNet = operatingNet + investingNet + financingNet;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёт о движении денежных средств</h1>
          <p className="text-muted-foreground">Cash Flow Statement — {data.period}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
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
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Начальный остаток</div><div className="text-2xl font-bold">{formatMoney(data.opening_balance)} ₽</div></CardContent></Card>
        <Card className={totalNet >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Чистое изменение</div><div className={`text-2xl font-bold ${totalNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{totalNet >= 0 ? "+" : ""}{formatMoney(totalNet)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Конечный остаток</div><div className="text-2xl font-bold">{formatMoney(data.closing_balance)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Activity className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Период</div><div className="text-lg font-bold">{data.period}</div></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-500" />Операционная деятельность</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Поступления от покупателей</span><span className="font-mono text-emerald-600">+{formatMoney(data.operating.receipts_from_customers)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Прочие поступления</span><span className="font-mono text-emerald-600">+{formatMoney(data.operating.other_receipts)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Платежи поставщикам</span><span className="font-mono text-red-600">−{formatMoney(data.operating.payments_to_suppliers)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Зарплата</span><span className="font-mono text-red-600">−{formatMoney(data.operating.payments_to_employees)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Налоги</span><span className="font-mono text-red-600">−{formatMoney(data.operating.tax_payments)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Прочие платежи</span><span className="font-mono text-red-600">−{formatMoney(data.operating.other_payments)}</span></div>
            <Separator />
            <div className="flex justify-between font-medium"><span>Итого</span><span className={`font-mono ${operatingNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{operatingNet >= 0 ? "+" : ""}{formatMoney(operatingNet)} ₽</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-500" />Инвестиционная деятельность</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Продажа ОС</span><span className="font-mono text-emerald-600">+{formatMoney(data.investing.fixed_assets_sale)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Дивиденды полученные</span><span className="font-mono text-emerald-600">+{formatMoney(data.investing.dividends_received)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Покупка ОС</span><span className="font-mono text-red-600">−{formatMoney(data.investing.fixed_assets_purchase)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Инвестиции</span><span className="font-mono text-red-600">−{formatMoney(data.investing.investments)}</span></div>
            <Separator />
            <div className="flex justify-between font-medium"><span>Итого</span><span className={`font-mono ${investingNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{investingNet >= 0 ? "+" : ""}{formatMoney(investingNet)} ₽</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-500" />Финансовая деятельность</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Кредиты полученные</span><span className="font-mono text-emerald-600">+{formatMoney(data.financing.loans_received)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Вклады в капитал</span><span className="font-mono text-emerald-600">+{formatMoney(data.financing.capital_contributions)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Погашение кредитов</span><span className="font-mono text-red-600">−{formatMoney(data.financing.loans_repaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Дивиденды выплаченные</span><span className="font-mono text-red-600">−{formatMoney(data.financing.dividends_paid)}</span></div>
            <Separator />
            <div className="flex justify-between font-medium"><span>Итого</span><span className={`font-mono ${financingNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{financingNet >= 0 ? "+" : ""}{formatMoney(financingNet)} ₽</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
