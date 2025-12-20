"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Calculator, RefreshCw } from "lucide-react";
import { PayrollPayslip, PayrollPeriod, payslipStatusLabels } from "@/lib/accounting/payroll/types";
import { getPayslips } from "@/lib/accounting/payroll/service";

interface PayrollPayslipsPageProps {
  initialPayslips: PayrollPayslip[];
  periods: PayrollPeriod[];
  initialYear: number;
  initialMonth: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    draft: "outline",
    calculated: "secondary",
    approved: "default",
    paid: "default",
  };
  return (
    <Badge variant={variants[status] || "secondary"}>
      {payslipStatusLabels[status as keyof typeof payslipStatusLabels] || status}
    </Badge>
  );
}

export function PayrollPayslipsPage({
  initialPayslips,
  periods: _periods,
  initialYear,
  initialMonth,
}: PayrollPayslipsPageProps) {
  void _periods;
  const [payslips, setPayslips] = useState(initialPayslips);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newPayslips = await getPayslips({ year, month });
      setPayslips(newPayslips);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAccrued = payslips.reduce((sum, p) => sum + (p.total_accrued || 0), 0);
  const totalDeducted = payslips.reduce((sum, p) => sum + (p.total_deducted || 0), 0);
  const totalToPay = payslips.reduce((sum, p) => sum + (p.to_pay || 0), 0);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Расчётные листки</h1>
          <p className="text-muted-foreground">
            Начисления и удержания по сотрудникам
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Рассчитать зарплату
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Период:</span>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Листков</div>
            <div className="text-2xl font-bold">{payslips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Начислено</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalAccrued)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Удержано</div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totalDeducted)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">К выплате</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(totalToPay)} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Расчётные листки за {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead className="text-center">Дней</TableHead>
                <TableHead className="text-right">Начислено</TableHead>
                <TableHead className="text-right">НДФЛ</TableHead>
                <TableHead className="text-right">Удержано</TableHead>
                <TableHead className="text-right">К выплате</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell className="font-medium">
                    {(slip as PayrollPayslip & { employee?: { last_name: string; first_name: string } }).employee 
                      ? `${(slip as PayrollPayslip & { employee?: { last_name: string; first_name: string } }).employee?.last_name} ${(slip as PayrollPayslip & { employee?: { last_name: string; first_name: string } }).employee?.first_name}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">{slip.worked_days}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {formatMoney(slip.total_accrued || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatMoney(slip.ndfl_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatMoney(slip.total_deducted || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatMoney(slip.to_pay || 0)}
                  </TableCell>
                  <TableCell>{getStatusBadge(slip.status)}</TableCell>
                </TableRow>
              ))}
              {payslips.length > 0 && (
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>Итого</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {formatMoney(totalAccrued)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatMoney(payslips.reduce((sum, p) => sum + p.ndfl_amount, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatMoney(totalDeducted)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(totalToPay)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              {payslips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Расчётные листки за этот период не найдены</p>
                    <p className="text-sm">Запустите расчёт зарплаты</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
