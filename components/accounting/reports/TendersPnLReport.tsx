"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  Percent,
  FileText,
  Calendar,
  Download,
  Wallet,
  BarChart3,
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
import type { TenderPnL } from "@/lib/accounting/reports";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TendersPnLReportProps {
  data: TenderPnL[];
  year: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    won: { label: "Выигран", variant: "default" },
    in_progress: { label: "В работе", variant: "secondary" },
    completed: { label: "Завершён", variant: "outline" },
    lost: { label: "Проигран", variant: "destructive" },
  };
  const info = statusMap[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function TendersPnLReport({ data, year }: TendersPnLReportProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(year.toString());

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    router.push(`/tenders/accounting/pnl?year=${value}`);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Итоги
  const totalRevenue = data.reduce((sum, t) => sum + t.revenue, 0);
  const totalCosts = data.reduce((sum, t) => sum + t.directCosts + t.indirectCosts, 0);
  const totalProfit = data.reduce((sum, t) => sum + t.grossProfit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Топ-10 для графика
  const top10 = data.slice(0, 10);

  const chartData = {
    labels: top10.map(t => t.purchaseNumber.slice(0, 15) + (t.purchaseNumber.length > 15 ? "..." : "")),
    datasets: [
      {
        label: "Выручка",
        data: top10.map(t => t.revenue / 100),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderRadius: 4,
      },
      {
        label: "Затраты",
        data: top10.map(t => (t.directCosts + t.indirectCosts) / 100),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderRadius: 4,
      },
      {
        label: "Прибыль",
        data: top10.map(t => t.grossProfit / 100),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
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
            return `${ctx.dataset.label}: ${formatMoney((ctx.raw as number) * 100)}`;
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
              <BarChart3 className="h-7 w-7 text-primary" />
              P&L по тендерам
            </h1>
            <p className="text-muted-foreground">
              Маржинальность и прибыльность проектов за {year} год
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                <p className="text-sm text-muted-foreground">Общая выручка</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatMoney(totalRevenue)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Общие затраты</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMoney(totalCosts)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Валовая прибыль</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(totalProfit)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <TrendingUp className={`h-6 w-6 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средняя маржа</p>
                <p className={`text-2xl font-bold ${avgMargin >= 20 ? 'text-green-600' : avgMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {avgMargin.toFixed(1)}%
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                avgMargin >= 20 ? 'bg-green-100' : avgMargin >= 10 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Percent className={`h-6 w-6 ${
                  avgMargin >= 20 ? 'text-green-600' : avgMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {top10.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Топ-10 тендеров по выручке</CardTitle>
            <CardDescription>Сравнение выручки, затрат и прибыли</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Детализация по тендерам
          </CardTitle>
          <CardDescription>
            Всего {data.length} тендеров за {year} год
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№ закупки</TableHead>
                  <TableHead className="max-w-[300px]">Предмет</TableHead>
                  <TableHead className="text-right">Выручка</TableHead>
                  <TableHead className="text-right">Прямые затраты</TableHead>
                  <TableHead className="text-right">Валовая прибыль</TableHead>
                  <TableHead className="text-right">Маржа</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((tender) => (
                  <TableRow key={tender.tenderId}>
                    <TableCell className="font-mono text-sm">
                      <Link 
                        href={`/tenders/${tender.tenderId}`}
                        className="text-primary hover:underline"
                      >
                        {tender.purchaseNumber.slice(0, 20)}
                        {tender.purchaseNumber.length > 20 && "..."}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate" title={tender.subject}>
                      {tender.subject}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatMoney(tender.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatMoney(tender.directCosts)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      tender.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatMoney(tender.grossProfit)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      tender.margin >= 20 ? 'text-green-600' : tender.margin >= 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {tender.margin.toFixed(1)}%
                    </TableCell>
                    <TableCell>{getStatusBadge(tender.status)}</TableCell>
                  </TableRow>
                ))}

                {/* Итого */}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>ИТОГО</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatMoney(totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatMoney(totalCosts)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatMoney(totalProfit)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    avgMargin >= 20 ? 'text-green-600' : avgMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {avgMargin.toFixed(1)}%
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет данных о тендерах за {year} год</p>
              <p className="text-sm mt-2">
                Создавайте документы с привязкой к тендерам для отслеживания маржинальности
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/dds">
            <Wallet className="h-4 w-4 mr-2" />
            Отчёт ДДС
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tenders/accounting/calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Платёжный календарь
          </Link>
        </Button>
      </div>
    </div>
  );
}
