"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import ExpenseBreakdownDonut from "@/components/reports/ExpenseBreakdownDonut";
import type { DashboardBreakdownPoint } from "@/lib/dashboard/service";
import { formatMoney } from "@/lib/utils/format";
import { loadExpenseBreakdownAction } from "@/app/(protected)/finance/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";

type PresetOption = {
  id: string;
  label: string;
  months?: number;
};

const PRESET_OPTIONS: PresetOption[] = [
  { id: "months-1", label: "1 месяц", months: 1 },
  { id: "months-3", label: "3 месяца", months: 3 },
  { id: "months-6", label: "6 месяцев", months: 6 },
  { id: "months-12", label: "12 месяцев", months: 12 },
  { id: "custom", label: "Произвольный период" },
];

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [mode, setMode] = useState<"months" | "custom">("months");
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [customRange, setCustomRange] = useState(() => {
    if (range) {
      return {
        from: range.from.slice(0, 10),
        to: range.to.slice(0, 10),
      };
    }
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: formatInputDate(from), to: formatInputDate(now) };
  });
  const [chartData, setChartData] = useState({
    breakdown,
    total,
    currency,
    range: range
      ? {
          from: range.from.slice(0, 10),
          to: range.to.slice(0, 10),
        }
      : customRange,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChartData({
      breakdown,
      total,
      currency,
      range: range
        ? {
            from: range.from.slice(0, 10),
            to: range.to.slice(0, 10),
          }
        : customRange,
    });
  }, [breakdown, total, currency, range, customRange]);

  useEffect(() => {
    if (range) {
      setCustomRange({ from: range.from.slice(0, 10), to: range.to.slice(0, 10) });
    }
  }, [range]);

  const selectValue = mode === "custom" ? "custom" : `months-${selectedMonths}`;

  const fetchBreakdown = useCallback((request: Parameters<typeof loadExpenseBreakdownAction>[0]) => {
    startTransition(async () => {
      const result = await loadExpenseBreakdownAction(request);
      if (result.success) {
        setError(null);
        setChartData({
          breakdown: result.data.breakdown,
          total: result.data.total,
          currency: result.data.currency,
          range: {
            from: result.data.range.from.slice(0, 10),
            to: result.data.range.to.slice(0, 10),
          },
        });
      } else {
        setError(result.error);
      }
    });
  }, []);

  const handlePresetChange = (months: number) => {
    setMode("months");
    setSelectedMonths(months);
    setError(null);
    fetchBreakdown({ type: "months", months });
  };

  const customRangeValid = useMemo(() => {
    const fromDate = new Date(customRange.from);
    const toDate = new Date(customRange.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return false;
    }
    return fromDate <= toDate;
  }, [customRange.from, customRange.to]);

  useEffect(() => {
    if (mode === "custom") {
      if (customRangeValid) {
        fetchBreakdown({ type: "range", from: customRange.from, to: customRange.to });
      } else {
        setError("Дата начала должна быть не позже даты окончания");
      }
    }
  }, [mode, customRangeValid, customRange.from, customRange.to, fetchBreakdown]);

  const hasData = chartData.breakdown.length > 0;
  const periodLabel = mode === "custom"
    ? `${chartData.range.from} — ${chartData.range.to}`
    : PRESET_OPTIONS.find((option) => option.id === selectValue)?.label ?? "Период";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Расходы по категориям</CardTitle>
            <p className="text-xs text-muted-foreground">Топ категорий, % распределения</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectValue} onValueChange={(value) => {
              if (value === "custom") {
                setMode("custom");
                setError(null);
              } else {
                const preset = PRESET_OPTIONS.find((option) => option.id === value);
                if (preset && typeof preset.months === "number") {
                  handlePresetChange(preset.months);
                }
              }
            }} disabled={isPending}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemove} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "custom" && (
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label className="text-xs">От</Label>
              <Input type="date" value={customRange.from} onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))} disabled={isPending} className="h-8" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">До</Label>
              <Input type="date" value={customRange.to} onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))} disabled={isPending} className="h-8" />
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        {hasData ? (
          <div className="space-y-4">
            <div className="h-[200px]">
              <ExpenseBreakdownDonut labels={chartData.breakdown.map((item) => item.category)} values={chartData.breakdown.map((item) => item.amount)} currency={chartData.currency} />
            </div>
            <div className="space-y-2">
              {chartData.breakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.category}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.percent.toFixed(1)}%</span>
                  </div>
                  <span className="font-semibold">{formatMoney(Math.round(item.amount * 100), chartData.currency)}</span>
                </div>
              ))}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div>Период: {periodLabel}</div>
                <div>Всего: {formatMoney(Math.round(chartData.total * 100), chartData.currency)}</div>
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
