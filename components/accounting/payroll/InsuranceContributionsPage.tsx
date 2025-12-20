"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface MonthData {
  month: number;
  month_name: string;
  salary_base: number;
  pfr: number;
  fss: number;
  foms: number;
  fss_ns: number;
  total: number;
  paid: number;
}

interface Props {
  year: number;
  months: MonthData[];
  rates: { pfr: number; fss: number; foms: number; fss_ns: number };
  totals: { salary_base: number; pfr: number; fss: number; foms: number; fss_ns: number; total: number; paid: number };
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

export function InsuranceContributionsPage({ year, months, rates, totals }: Props) {
  const [selectedYear, setSelectedYear] = useState(year.toString());
  const debt = totals.total - totals.paid;
  const hasDebt = debt > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Страховые взносы</h1>
          <p className="text-muted-foreground">ПФР, ФСС, ФОМС за {selectedYear} год</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />РСВ</Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />4-ФСС</Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">ФОТ (база)</div><div className="text-2xl font-bold">{formatMoney(totals.salary_base)} ₽</div></CardContent></Card>
        <Card className="border-blue-200"><CardContent className="pt-6"><div className="text-sm text-muted-foreground">ПФР ({rates.pfr}%)</div><div className="text-2xl font-bold text-blue-600">{formatMoney(totals.pfr)} ₽</div></CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="pt-6"><div className="text-sm text-muted-foreground">ФОМС ({rates.foms}%)</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(totals.foms)} ₽</div></CardContent></Card>
        <Card className="border-amber-200"><CardContent className="pt-6"><div className="text-sm text-muted-foreground">ФСС ({rates.fss}%)</div><div className="text-2xl font-bold text-amber-600">{formatMoney(totals.fss)} ₽</div></CardContent></Card>
        <Card className={hasDebt ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1">{hasDebt ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-emerald-500" />}{hasDebt ? "Задолженность" : "Оплачено"}</div><div className={`text-2xl font-bold ${hasDebt ? "text-red-600" : "text-emerald-600"}`}>{formatMoney(hasDebt ? debt : totals.paid)} ₽</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Тарифы страховых взносов</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6 text-center">
            <div className="p-4 bg-blue-50 rounded-lg"><div className="text-3xl font-bold text-blue-600">{rates.pfr}%</div><div className="text-sm text-muted-foreground mt-1">ПФР</div></div>
            <div className="p-4 bg-emerald-50 rounded-lg"><div className="text-3xl font-bold text-emerald-600">{rates.foms}%</div><div className="text-sm text-muted-foreground mt-1">ФОМС</div></div>
            <div className="p-4 bg-amber-50 rounded-lg"><div className="text-3xl font-bold text-amber-600">{rates.fss}%</div><div className="text-sm text-muted-foreground mt-1">ФСС (ВНиМ)</div></div>
            <div className="p-4 bg-purple-50 rounded-lg"><div className="text-3xl font-bold text-purple-600">{rates.fss_ns}%</div><div className="text-sm text-muted-foreground mt-1">ФСС (НС)</div></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Взносы по месяцам</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Месяц</TableHead><TableHead className="text-right">ФОТ</TableHead><TableHead className="text-right">ПФР</TableHead><TableHead className="text-right">ФОМС</TableHead><TableHead className="text-right">ФСС</TableHead><TableHead className="text-right">НС</TableHead><TableHead className="text-right">Итого</TableHead><TableHead className="text-right">Оплачено</TableHead></TableRow></TableHeader>
            <TableBody>
              {months.map(m => {
                const monthDebt = m.total - m.paid;
                return (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(m.salary_base)}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">{formatMoney(m.pfr)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatMoney(m.foms)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{formatMoney(m.fss)}</TableCell>
                    <TableCell className="text-right font-mono text-purple-600">{formatMoney(m.fss_ns)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatMoney(m.total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(m.paid)}{monthDebt > 0 && <Badge variant="destructive" className="ml-2 text-xs">долг</Badge>}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Итого</TableCell>
                <TableCell className="text-right font-mono">{formatMoney(totals.salary_base)}</TableCell>
                <TableCell className="text-right font-mono text-blue-600">{formatMoney(totals.pfr)}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600">{formatMoney(totals.foms)}</TableCell>
                <TableCell className="text-right font-mono text-amber-600">{formatMoney(totals.fss)}</TableCell>
                <TableCell className="text-right font-mono text-purple-600">{formatMoney(totals.fss_ns)}</TableCell>
                <TableCell className="text-right font-mono">{formatMoney(totals.total)}</TableCell>
                <TableCell className="text-right font-mono">{formatMoney(totals.paid)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
