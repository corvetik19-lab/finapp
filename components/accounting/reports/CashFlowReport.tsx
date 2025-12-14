"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FileSpreadsheet,
  Calendar,
  Download,
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { CashFlowReport as CashFlowReportType } from "@/lib/accounting/reports";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CashFlowReportProps {
  report: CashFlowReportType;
  year: number;
  month?: number;
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function CashFlowReport({ report, year, month }: CashFlowReportProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(year.toString());
  const [selectedMonth, setSelectedMonth] = useState(month?.toString() || "all");

  const handlePeriodChange = () => {
    const params = new URLSearchParams();
    params.set("year", selectedYear);
    if (selectedMonth !== "all") {
      params.set("month", selectedMonth);
    }
    router.push(`/tenders/accounting/dds?${params.toString()}`);
  };

  const chartData = {
    labels: MONTHS,
    datasets: [
      {
        label: "Поступления",
        data: report.monthlyData.map(d => d.income / 100),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderRadius: 4,
      },
      {
        label: "Выплаты",
        data: report.monthlyData.map(d => -d.expense / 100),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const value = Math.abs(ctx.raw as number);
            return `${ctx.dataset.label}: ${formatMoney(value * 100)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: string | number) => formatMoney((value as number) * 100),
        },
      },
    },
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-7 w-7 text-primary" />
              Отчёт ДДС
            </h1>
            <p className="text-muted-foreground">
              Движение денежных средств за {report.period}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Весь год" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Весь год</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handlePeriodChange}>
              <Calendar className="h-4 w-4 mr-2" />
              Показать
            </Button>
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Поступления</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatMoney(report.operating.items
                    .filter(i => i.amount > 0)
                    .reduce((s, i) => s + i.amount, 0))}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Выплаты</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMoney(Math.abs(report.operating.items
                    .filter(i => i.amount < 0)
                    .reduce((s, i) => s + i.amount, 0)))}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Чистый денежный поток</p>
                <p className={`text-2xl font-bold ${report.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(report.netCashFlow)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                report.netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {report.netCashFlow >= 0 
                  ? <TrendingUp className="h-6 w-6 text-green-600" />
                  : <TrendingDown className="h-6 w-6 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Остаток на конец</p>
                <p className="text-2xl font-bold">
                  {formatMoney(report.closingBalance)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика денежных потоков</CardTitle>
          <CardDescription>Поступления и выплаты по месяцам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Report */}
      <div className="grid gap-6 md:grid-cols-1">
        {/* Операционная деятельность */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {report.operating.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Категория</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.operating.items.length > 0 ? (
                  <>
                    {report.operating.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className={`text-right font-medium ${
                          item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={2}>Итого операционная деятельность</TableCell>
                      <TableCell className={`text-right ${
                        report.operating.total >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {report.operating.total >= 0 ? '+' : ''}{formatMoney(report.operating.total)}
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Нет данных за период
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Инвестиционная деятельность */}
        {report.investing.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {report.investing.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.investing.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>Итого инвестиционная деятельность</TableCell>
                    <TableCell className={`text-right ${
                      report.investing.total >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {report.investing.total >= 0 ? '+' : ''}{formatMoney(report.investing.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Финансовая деятельность */}
        {report.financing.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {report.financing.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.financing.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>Итого финансовая деятельность</TableCell>
                    <TableCell className={`text-right ${
                      report.financing.total >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {report.financing.total >= 0 ? '+' : ''}{formatMoney(report.financing.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Итоговая таблица */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Итоги за период</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Остаток на начало периода</span>
                <span className="font-medium">{formatMoney(report.openingBalance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Чистый денежный поток от операционной деятельности</span>
                <span className={`font-medium ${report.operating.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.operating.total >= 0 ? '+' : ''}{formatMoney(report.operating.total)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Чистый денежный поток от инвестиционной деятельности</span>
                <span className={`font-medium ${report.investing.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.investing.total >= 0 ? '+' : ''}{formatMoney(report.investing.total)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Чистый денежный поток от финансовой деятельности</span>
                <span className={`font-medium ${report.financing.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.financing.total >= 0 ? '+' : ''}{formatMoney(report.financing.total)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b font-bold">
                <span>Чистое изменение денежных средств</span>
                <span className={report.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {report.netCashFlow >= 0 ? '+' : ''}{formatMoney(report.netCashFlow)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-lg">
                <span>Остаток на конец периода</span>
                <span>{formatMoney(report.closingBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Платёжный календарь
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/pnl">
            <TrendingUp className="h-4 w-4 mr-2" />
            P&L по тендерам
          </Link>
        </Button>
      </div>
    </div>
  );
}
