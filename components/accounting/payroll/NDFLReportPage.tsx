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
import { Download, FileText, Users, Calculator } from "lucide-react";

interface EmployeeNDFL {
  id: string;
  full_name: string;
  inn: string;
  total_income: number;
  taxable_income: number;
  deductions: number;
  tax_calculated: number;
  tax_withheld: number;
  tax_transferred: number;
}

interface Props {
  year: number;
  employees: EmployeeNDFL[];
  totals: {
    total_income: number;
    total_taxable: number;
    total_deductions: number;
    total_tax: number;
    total_withheld: number;
    total_transferred: number;
  };
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

export function NDFLReportPage({ year, employees, totals }: Props) {
  const [selectedYear, setSelectedYear] = useState(year.toString());

  const debtAmount = totals.total_withheld - totals.total_transferred;
  const hasDebt = debtAmount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">НДФЛ</h1>
          <p className="text-muted-foreground">Налог на доходы физических лиц за {selectedYear} год</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />6-НДФЛ</Button>
          <Button><FileText className="h-4 w-4 mr-2" />2-НДФЛ</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Сотрудников</div><div className="text-2xl font-bold">{employees.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Начислено дохода</div><div className="text-2xl font-bold">{formatMoney(totals.total_income)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Calculator className="h-3 w-3" />Исчислено НДФЛ</div><div className="text-2xl font-bold text-blue-600">{formatMoney(totals.total_tax)} ₽</div></CardContent></Card>
        <Card className={hasDebt ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">{hasDebt ? "Задолженность" : "Перечислено"}</div><div className={`text-2xl font-bold ${hasDebt ? "text-red-600" : "text-emerald-600"}`}>{formatMoney(hasDebt ? debtAmount : totals.total_transferred)} ₽</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Сводка по НДФЛ</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Начислено дохода</span><span className="font-mono">{formatMoney(totals.total_income)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Вычеты</span><span className="font-mono text-emerald-600">−{formatMoney(totals.total_deductions)} ₽</span></div>
              <div className="flex justify-between font-medium"><span>Налоговая база</span><span className="font-mono">{formatMoney(totals.total_taxable)} ₽</span></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Исчислено (13%)</span><span className="font-mono">{formatMoney(totals.total_tax)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Удержано</span><span className="font-mono">{formatMoney(totals.total_withheld)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Перечислено</span><span className="font-mono">{formatMoney(totals.total_transferred)} ₽</span></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between font-medium"><span>Задолженность</span><span className={`font-mono ${hasDebt ? "text-red-600" : "text-emerald-600"}`}>{hasDebt ? formatMoney(debtAmount) : "0"} ₽</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">НДФЛ по сотрудникам</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Сотрудник</TableHead><TableHead>ИНН</TableHead><TableHead className="text-right">Доход</TableHead><TableHead className="text-right">Вычеты</TableHead><TableHead className="text-right">НДФЛ</TableHead><TableHead className="text-right">Удержано</TableHead></TableRow></TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">{e.inn}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(e.total_income)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{e.deductions > 0 ? `−${formatMoney(e.deductions)}` : "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(e.tax_calculated)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(e.tax_withheld)}{e.tax_withheld < e.tax_calculated && <Badge variant="destructive" className="ml-2 text-xs">долг</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
