"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Loader2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  generateCashBook,
  getCashBookSummary,
  type CashBook,
  type CashBookSummary,
} from "@/lib/accounting/documents/cash-book";

interface CashBookPageProps {
  initialSummary: CashBookSummary | null;
  availableMonths: { year: number; month: number }[];
  currentYear: number;
  currentMonth: number;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function CashBookPage({ 
  initialSummary, 
  availableMonths,
  currentYear,
  currentMonth 
}: CashBookPageProps) {
  const { show } = useToast();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState<CashBookSummary | null>(initialSummary);
  const [cashBook, setCashBook] = useState<CashBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handlePeriodChange = async (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setLoading(true);
    setCashBook(null);
    setShowDetails(false);
    
    try {
      const newSummary = await getCashBookSummary(newYear, newMonth);
      setSummary(newSummary);
    } catch (error) {
      show("Ошибка загрузки данных", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDetails = async () => {
    setLoading(true);
    try {
      const book = await generateCashBook(year, month);
      setCashBook(book);
      setShowDetails(true);
    } catch (error) {
      show("Ошибка загрузки кассовой книги", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Получаем уникальные годы
  const years = Array.from(new Set(availableMonths.map(m => m.year))).sort((a, b) => b - a);
  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }

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
              <BookOpen className="h-7 w-7 text-primary" />
              Кассовая книга
            </h1>
            <p className="text-muted-foreground">
              Регистр кассовых операций организации
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={v => handlePeriodChange(Number(v), month)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={String(month)}
            onValueChange={v => handlePeriodChange(year, Number(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Скачать PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      {loading && !summary ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Остаток на начало</p>
                  <p className="text-2xl font-bold">{formatMoney(summary.opening_balance)}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Приход</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{formatMoney(summary.total_income)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">{summary.pko_count} ПКО</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Расход</p>
                  <p className="text-2xl font-bold text-red-600">
                    −{formatMoney(summary.total_expense)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">{summary.rko_count} РКО</p>
                </div>
                <ArrowDownRight className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary">Остаток на конец</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatMoney(summary.closing_balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.days_with_operations} дней с операциями
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет данных за выбранный период</p>
              <p className="text-sm mt-2">
                Создайте кассовые ордера для формирования книги
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Button */}
      {summary && summary.days_with_operations > 0 && !showDetails && (
        <div className="text-center">
          <Button onClick={handleLoadDetails} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Показать листы кассовой книги
          </Button>
        </div>
      )}

      {/* Cash Book Pages */}
      {showDetails && cashBook && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Листы кассовой книги за {MONTH_NAMES[month - 1]} {year}
            </h2>
            <Badge variant="outline">
              Всего листов: {cashBook.total_pages}
            </Badge>
          </div>

          {cashBook.pages.map((page, pageIdx) => (
            <Card key={pageIdx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Лист №{page.page_number} от {formatDate(page.date)}
                  </CardTitle>
                  <div className="flex gap-4 text-sm">
                    <span>Остаток на начало: <strong>{formatMoney(page.opening_balance)}</strong></span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>№ документа</TableHead>
                      <TableHead>От кого / Кому</TableHead>
                      <TableHead>Основание</TableHead>
                      <TableHead className="text-right">Приход</TableHead>
                      <TableHead className="text-right">Расход</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {page.entries.map((entry, entryIdx) => (
                      <TableRow key={entryIdx}>
                        <TableCell>
                          <Badge variant="outline" className={entry.order_type === "pko" ? "text-green-600" : "text-red-600"}>
                            {entry.order_type === "pko" ? "ПКО" : "РКО"} №{entry.order_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{entry.counterparty_name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {entry.basis}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {entry.order_type === "pko" ? formatMoney(entry.amount) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {entry.order_type === "rko" ? formatMoney(entry.amount) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Итого за день */}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3}>Итого за день</TableCell>
                      <TableCell className="text-right text-green-600">
                        {page.total_income > 0 ? formatMoney(page.total_income) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {page.total_expense > 0 ? formatMoney(page.total_expense) : "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell colSpan={3}>Остаток на конец дня</TableCell>
                      <TableCell colSpan={2} className="text-right">
                        {formatMoney(page.closing_balance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link to Cash Orders */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Кассовые ордера</h3>
              <p className="text-sm text-muted-foreground">
                Перейти к списку ПКО и РКО для создания новых операций
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/tenders/accounting/cash-orders">
                Открыть кассовые ордера
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
