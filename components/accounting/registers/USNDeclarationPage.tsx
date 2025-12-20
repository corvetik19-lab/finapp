"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Calculator, CheckCircle } from "lucide-react";

interface USNData {
  year: number;
  tax_object: "income" | "income_expense";
  tax_rate: number;
  quarters: Array<{
    quarter: number;
    income: number;
    expenses: number;
    tax_base: number;
    tax_calculated: number;
    insurance_paid: number;
    tax_to_pay: number;
  }>;
  annual: {
    total_income: number;
    total_expenses: number;
    total_tax_base: number;
    total_tax: number;
    total_insurance: number;
    total_to_pay: number;
    min_tax: number;
  };
}

interface Props {
  data: USNData;
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

export function USNDeclarationPage({ data }: Props) {
  const isMinTax = data.annual.min_tax > data.annual.total_to_pay;
  const finalTax = isMinTax ? data.annual.min_tax : data.annual.total_to_pay;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Декларация УСН</h1>
          <p className="text-muted-foreground">{data.year} год • {data.tax_object === "income" ? "Доходы" : "Доходы минус расходы"} • {data.tax_rate}%</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue={data.year.toString()}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Скачать XML</Button>
          <Button><FileText className="h-4 w-4 mr-2" />Сформировать</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Доходы за год</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(data.annual.total_income)} ₽</div></CardContent></Card>
        {data.tax_object === "income_expense" && <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Расходы за год</div><div className="text-2xl font-bold text-red-600">{formatMoney(data.annual.total_expenses)} ₽</div></CardContent></Card>}
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Налоговая база</div><div className="text-2xl font-bold">{formatMoney(data.annual.total_tax_base)} ₽</div></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50"><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Calculator className="h-3 w-3" />Налог к уплате</div><div className="text-2xl font-bold text-blue-600">{formatMoney(finalTax)} ₽</div>{isMinTax && <Badge variant="secondary" className="mt-1">Мин. налог 1%</Badge>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Расчёт по кварталам</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {data.quarters.map(q => (
              <div key={q.quarter} className="p-4 border rounded-lg space-y-3">
                <div className="font-medium text-center">{q.quarter} квартал</div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Доходы</span><span className="font-mono">{formatMoney(q.income)}</span></div>
                  {data.tax_object === "income_expense" && <div className="flex justify-between"><span className="text-muted-foreground">Расходы</span><span className="font-mono">{formatMoney(q.expenses)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">База</span><span className="font-mono">{formatMoney(q.tax_base)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Налог</span><span className="font-mono">{formatMoney(q.tax_calculated)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Взносы</span><span className="font-mono text-emerald-600">−{formatMoney(q.insurance_paid)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>К уплате</span><span className="font-mono text-blue-600">{formatMoney(q.tax_to_pay)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" />Итоги за год</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Всего доходов</span><span className="font-mono">{formatMoney(data.annual.total_income)} ₽</span></div>
              {data.tax_object === "income_expense" && <div className="flex justify-between"><span className="text-muted-foreground">Всего расходов</span><span className="font-mono">{formatMoney(data.annual.total_expenses)} ₽</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Налоговая база</span><span className="font-mono">{formatMoney(data.annual.total_tax_base)} ₽</span></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Исчисленный налог ({data.tax_rate}%)</span><span className="font-mono">{formatMoney(data.annual.total_tax)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Уплаченные взносы</span><span className="font-mono text-emerald-600">−{formatMoney(data.annual.total_insurance)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Минимальный налог (1%)</span><span className="font-mono">{formatMoney(data.annual.min_tax)} ₽</span></div>
              <Separator />
              <div className="flex justify-between font-medium text-lg"><span>Итого к уплате</span><span className="font-mono text-blue-600">{formatMoney(finalTax)} ₽</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
