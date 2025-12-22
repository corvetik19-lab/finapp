"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import ExpenseBreakdownDonut from "@/components/reports/ExpenseBreakdownDonut";
import type { DashboardBreakdownPoint } from "@/lib/dashboard/service";
import { formatMoney } from "@/lib/utils/format";
import { loadExpenseBreakdownAction } from "@/app/(protected)/finance/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, ArrowLeftRight } from "lucide-react";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
};

const getMonthRange = (year: number, month: number) => {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

export type ExpenseByCategoryCardProps = {
  breakdown: DashboardBreakdownPoint[];
  currency: string;
  total: number;
  range?: { from: string; to: string };
  onRemove?: () => void;
};

const noop = () => {};

export default function ExpenseByCategoryCard({
  breakdown,
  currency,
  total,
  range,
  onRemove,
}: ExpenseByCategoryCardProps) {
  const handleRemove = onRemove ?? noop;
  const [isPending, startTransition] = useTransition();
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(now.getFullYear());
  const [compareMonth, setCompareMonth] = useState(now.getMonth() > 0 ? now.getMonth() - 1 : 11);
  
  const [chartData, setChartData] = useState({
    breakdown,
    total,
    currency,
    range: range
      ? { from: range.from.slice(0, 10), to: range.to.slice(0, 10) }
      : getMonthRange(selectedYear, selectedMonth),
  });
  
  const [compareData, setCompareData] = useState<{
    breakdown: DashboardBreakdownPoint[];
    total: number;
    currency: string;
    range: { from: string; to: string };
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChartData({
      breakdown,
      total,
      currency,
      range: range
        ? { from: range.from.slice(0, 10), to: range.to.slice(0, 10) }
        : getMonthRange(selectedYear, selectedMonth),
    });
  }, [breakdown, total, currency, range, selectedYear, selectedMonth]);

  const fetchBreakdown = useCallback((request: Parameters<typeof loadExpenseBreakdownAction>[0], isCompare = false) => {
    startTransition(async () => {
      const result = await loadExpenseBreakdownAction(request);
      if (result.success) {
        setError(null);
        const data = {
          breakdown: result.data.breakdown,
          total: result.data.total,
          currency: result.data.currency,
          range: {
            from: result.data.range.from.slice(0, 10),
            to: result.data.range.to.slice(0, 10),
          },
        };
        if (isCompare) {
          setCompareData(data);
        } else {
          setChartData(data);
        }
      } else {
        setError(result.error);
      }
    });
  }, []);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setError(null);
    const { from, to } = getMonthRange(year, month);
    fetchBreakdown({ type: "range", from, to });
  };

  const handleCompareMonthChange = (year: number, month: number) => {
    setCompareYear(year);
    setCompareMonth(month);
    setError(null);
    const { from, to } = getMonthRange(year, month);
    fetchBreakdown({ type: "range", from, to }, true);
  };

  const toggleCompareMode = () => {
    if (!compareMode) {
      const { from, to } = getMonthRange(compareYear, compareMonth);
      fetchBreakdown({ type: "range", from, to }, true);
    } else {
      setCompareData(null);
    }
    setCompareMode(!compareMode);
  };

  useEffect(() => {
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    fetchBreakdown({ type: "range", from, to });
  }, []);

  const hasData = chartData.breakdown.length > 0;
  const periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const comparePeriodLabel = compareMode ? `${MONTH_NAMES[compareMonth]} ${compareYear}` : "";

  const availableYears = useMemo(() => getAvailableYears(), []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Расходы по категориям</CardTitle>
            <p className="text-xs text-muted-foreground">Топ категорий, % распределения</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => handleMonthChange(Number(v), selectedMonth)} disabled={isPending}>
              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedMonth)} onValueChange={(v) => handleMonthChange(selectedYear, Number(v))} disabled={isPending}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={compareMode ? "default" : "outline"} size="sm" className="h-8" onClick={toggleCompareMode} disabled={isPending}>
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemove} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {compareMode && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Сравнить с:</span>
            <Select value={String(compareYear)} onValueChange={(v) => handleCompareMonthChange(Number(v), compareMonth)} disabled={isPending}>
              <SelectTrigger className="w-[80px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(compareMonth)} onValueChange={(v) => handleCompareMonthChange(compareYear, Number(v))} disabled={isPending}>
              <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        {hasData ? (
          <div className="space-y-4">
            <div className="h-[200px]">
              <ExpenseBreakdownDonut labels={chartData.breakdown.map((item) => item.category)} values={chartData.breakdown.map((item) => item.amount)} currency={chartData.currency} />
            </div>
            <div className="space-y-2">
              {chartData.breakdown.map((item) => {
                const compareItem = compareData?.breakdown.find((c) => c.category === item.category);
                const diff = compareItem ? item.amount - compareItem.amount : null;
                return (
                  <div key={item.category} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.category}</span>
                      <span className="text-xs text-muted-foreground ml-2">{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatMoney(Math.round(item.amount * 100), chartData.currency)}</span>
                      {compareMode && diff !== null && (
                        <span className={`text-xs ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-muted-foreground"}`}>
                          {diff > 0 ? "+" : ""}{formatMoney(Math.round(diff * 100), chartData.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{periodLabel}</span>
                  <span>{formatMoney(Math.round(chartData.total * 100), chartData.currency)}</span>
                </div>
                {compareMode && compareData && (
                  <div className="flex justify-between mt-1">
                    <span>{comparePeriodLabel}</span>
                    <span>{formatMoney(Math.round(compareData.total * 100), compareData.currency)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">Нет расходов за выбранный период.</div>
        )}
      </CardContent>
    </Card>
  );
}
