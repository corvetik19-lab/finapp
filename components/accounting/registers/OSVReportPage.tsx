"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Download, RefreshCw, FileSpreadsheet } from "lucide-react";
import { OSVReport } from "@/lib/accounting/registers/types";
import { getOSV } from "@/lib/accounting/registers/service";

interface OSVReportPageProps {
  initialReport: OSVReport;
  initialStartDate: string;
  initialEndDate: string;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function OSVReportPage({
  initialReport,
  initialStartDate,
  initialEndDate,
}: OSVReportPageProps) {
  const [report, setReport] = useState(initialReport);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newReport = await getOSV(startDate, endDate);
      setReport(newReport);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Оборотно-сальдовая ведомость</h1>
          <p className="text-muted-foreground">
            Сводный отчёт по счетам за период
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт в Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Период:</span>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
            <Button onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Сформировать
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            ОСВ за период {startDate} — {endDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="border-r">Счёт</TableHead>
                  <TableHead rowSpan={2} className="border-r">Наименование</TableHead>
                  <TableHead colSpan={2} className="text-center border-r">Сальдо на начало</TableHead>
                  <TableHead colSpan={2} className="text-center border-r">Обороты за период</TableHead>
                  <TableHead colSpan={2} className="text-center">Сальдо на конец</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right">Дебет</TableHead>
                  <TableHead className="text-right border-r">Кредит</TableHead>
                  <TableHead className="text-right">Дебет</TableHead>
                  <TableHead className="text-right border-r">Кредит</TableHead>
                  <TableHead className="text-right">Дебет</TableHead>
                  <TableHead className="text-right">Кредит</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.account_code}>
                    <TableCell className="font-mono font-medium border-r">
                      {row.account_code}
                    </TableCell>
                    <TableCell className="border-r">{row.account_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.opening_debit > 0 ? formatMoney(row.opening_debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono border-r">
                      {row.opening_credit > 0 ? formatMoney(row.opening_credit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.turnover_debit > 0 ? formatMoney(row.turnover_debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono border-r">
                      {row.turnover_credit > 0 ? formatMoney(row.turnover_credit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.closing_debit > 0 ? formatMoney(row.closing_debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.closing_credit > 0 ? formatMoney(row.closing_credit) : ""}
                    </TableCell>
                  </TableRow>
                ))}
                {report.rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={2} className="border-r">Итого</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(report.totals.opening_debit)}
                    </TableCell>
                    <TableCell className="text-right font-mono border-r">
                      {formatMoney(report.totals.opening_credit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(report.totals.turnover_debit)}
                    </TableCell>
                    <TableCell className="text-right font-mono border-r">
                      {formatMoney(report.totals.turnover_credit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(report.totals.closing_debit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(report.totals.closing_credit)}
                    </TableCell>
                  </TableRow>
                )}
                {report.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Нет данных за выбранный период</p>
                      <p className="text-sm">Создайте проводки или выберите другой период</p>
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
