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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, RefreshCw, Check, Lock } from "lucide-react";
import { PayrollPeriod, periodStatusLabels } from "@/lib/accounting/payroll/types";
import { getPayrollPeriods } from "@/lib/accounting/payroll/service";

interface PayrollPeriodsPageProps {
  initialPeriods: PayrollPeriod[];
  initialYear: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    open: "outline",
    calculated: "secondary",
    approved: "default",
    paid: "default",
    closed: "destructive",
  };
  const icons: Record<string, React.ReactNode> = {
    approved: <Check className="h-3 w-3 mr-1" />,
    paid: <Check className="h-3 w-3 mr-1" />,
    closed: <Lock className="h-3 w-3 mr-1" />,
  };
  return (
    <Badge variant={variants[status] || "secondary"} className="flex items-center w-fit">
      {icons[status]}
      {periodStatusLabels[status as keyof typeof periodStatusLabels] || status}
    </Badge>
  );
}

export function PayrollPeriodsPage({
  initialPeriods,
  initialYear,
}: PayrollPeriodsPageProps) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [year, setYear] = useState(initialYear);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newPeriods = await getPayrollPeriods(year);
      setPeriods(newPeriods);
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalAccrued = periods.reduce((sum, p) => sum + p.total_accrued, 0);
  const totalToPay = periods.reduce((sum, p) => sum + p.total_to_pay, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Расчётные периоды</h1>
          <p className="text-muted-foreground">
            Управление периодами начисления зарплаты
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать период
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый расчётный период</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Месяц</Label>
                  <Select defaultValue={(new Date().getMonth() + 1).toString()}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-2">
                  <Label>Год</Label>
                  <Select defaultValue={new Date().getFullYear().toString()}>
                    <SelectTrigger>
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
                </div>
              </div>
              <div className="space-y-2">
                <Label>Дата выплаты</Label>
                <Input type="date" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Год:</span>
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

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Периодов за {year}</div>
                <div className="text-2xl font-bold">{periods.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Начислено за год</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalAccrued)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Выплачено за год</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(totalToPay)} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Расчётные периоды {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Период</TableHead>
                <TableHead>Даты</TableHead>
                <TableHead>Дата выплаты</TableHead>
                <TableHead className="text-right">Начислено</TableHead>
                <TableHead className="text-right">НДФЛ</TableHead>
                <TableHead className="text-right">К выплате</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">
                    {MONTHS[period.period_month - 1]} {period.period_year}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(period.start_date)} — {formatDate(period.end_date)}
                  </TableCell>
                  <TableCell>
                    {period.payment_date ? formatDate(period.payment_date) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {formatMoney(period.total_accrued)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatMoney(period.total_ndfl)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatMoney(period.total_to_pay)}
                  </TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                </TableRow>
              ))}
              {periods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет расчётных периодов за {year} год</p>
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
