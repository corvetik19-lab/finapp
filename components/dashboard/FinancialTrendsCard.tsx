"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import { loadTrendsAction } from "@/app/(protected)/finance/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";

export type FinancialTrendsCardProps = {
  labels: string[];
  income: number[];
  expense: number[];
  currency: string;
  initialMonths?: number;
  onRemove?: () => void;
};

const noop = () => {};

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

export default function FinancialTrendsCard({
  labels,
  income,
  expense,
  currency,
  initialMonths = 1,
  onRemove,
}: FinancialTrendsCardProps) {
  const handleRemove = onRemove ?? noop;
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"months" | "custom">("months");
  const [selectedMonths, setSelectedMonths] = useState(initialMonths);
  const [chartData, setChartData] = useState({ labels, income, expense });
  const [error, setError] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: formatInputDate(from), to: formatInputDate(now) };
  });

  const selectValue = mode === "custom" ? "custom" : `months-${selectedMonths}`;

  useEffect(() => {
    setChartData({ labels, income, expense });
  }, [labels, income, expense]);

  const fetchTrends = useCallback((request: Parameters<typeof loadTrendsAction>[0]) => {
    startTransition(async () => {
      const result = await loadTrendsAction(request);
      if (result.success) {
        setError(null);
        setChartData(result.data);
      } else {
        setError(result.error);
      }
    });
  }, []);

  const handlePresetChange = (months: number) => {
    setMode("months");
    setSelectedMonths(months);
    setError(null);
    fetchTrends({ type: "months", months });
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
        fetchTrends({ type: "range", from: customRange.from, to: customRange.to });
      } else {
        setError("Дата начала должна быть не позже даты окончания");
      }
    }
  }, [mode, customRangeValid, customRange.from, customRange.to, fetchTrends]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Финансовые тенденции</CardTitle>
            <p className="text-xs text-muted-foreground">Динамика доходов и расходов</p>
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
              <Input
                type="date"
                value={customRange.from}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, from: event.target.value }))}
                disabled={isPending}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">До</Label>
              <Input
                type="date"
                value={customRange.to}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, to: event.target.value }))}
                disabled={isPending}
                className="h-8"
              />
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        <div className="h-[250px]">
          <IncomeExpenseChart
            labels={chartData.labels}
            income={chartData.income}
            expense={chartData.expense}
            currency={currency}
          />
        </div>
      </CardContent>
    </Card>
  );
}
