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
import { Download, RefreshCw, FileText, Plus } from "lucide-react";
import { SalesLedgerEntry } from "@/lib/accounting/registers/types";
import { getSalesLedger } from "@/lib/accounting/registers/service";

interface SalesLedgerPageProps {
  initialEntries: SalesLedgerEntry[];
  initialYear: number;
  initialQuarter: number;
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

const QUARTERS = [
  { value: "1", label: "I квартал" },
  { value: "2", label: "II квартал" },
  { value: "3", label: "III квартал" },
  { value: "4", label: "IV квартал" },
];

export function SalesLedgerPage({
  initialEntries,
  initialYear,
  initialQuarter,
}: SalesLedgerPageProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [year, setYear] = useState(initialYear);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newEntries = await getSalesLedger(year, quarter);
      setEntries(newEntries);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + e.total_amount, 0);
  const totalVAT = entries.reduce((sum, e) => sum + e.vat_amount, 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Книга продаж</h1>
          <p className="text-muted-foreground">
            Учёт исходящего НДС для уплаты в бюджет
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить запись
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Период:</span>
            <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
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

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Записей в книге</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Сумма с НДС</div>
            <div className="text-2xl font-bold">{formatMoney(totalAmount)} ₽</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">НДС к уплате</div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totalVAT)} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Книга продаж за {QUARTERS.find((q) => q.value === quarter.toString())?.label} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">№</TableHead>
                  <TableHead className="w-[100px]">Код</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead className="w-[100px]">ИНН</TableHead>
                  <TableHead className="w-[120px]">Счёт-фактура</TableHead>
                  <TableHead className="w-[100px]">Дата</TableHead>
                  <TableHead className="text-right w-[120px]">Сумма</TableHead>
                  <TableHead className="text-right w-[100px]">НДС</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.entry_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.operation_code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.counterparty_name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.counterparty_inn}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.invoice_number}
                    </TableCell>
                    <TableCell>{formatDate(entry.invoice_date)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(entry.total_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatMoney(entry.vat_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length > 0 && (
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={6}>Итого</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatMoney(totalVAT)}
                    </TableCell>
                  </TableRow>
                )}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Нет записей за выбранный период</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
