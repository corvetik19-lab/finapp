"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import styles from "@/components/dashboard/Dashboard.module.css";
import { loadTrendsAction } from "@/app/(protected)/dashboard/actions";

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

  const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === "custom") {
      setMode("custom");
      setError(null);
    } else {
      const preset = PRESET_OPTIONS.find((option) => option.id === value);
      if (preset && typeof preset.months === "number") {
        handlePresetChange(preset.months);
      }
    }
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
    <section className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <div>
          <div className={styles.chartTitle}>Финансовые тенденции</div>
          <div className={styles.chartSubtitle}>Динамика доходов и расходов</div>
        </div>
        <div className={styles.chartActions}>
          <label className={styles.chartFilter}>
            Период
            <select value={selectValue} onChange={handlePeriodChange} disabled={isPending}>
              {PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.chartIconButton}
            onClick={handleRemove}
            aria-label="Скрыть виджет"
            disabled={isPending}
          >
            <span className="material-icons" aria-hidden>
              {isPending ? "hourglass_top" : "close"}
            </span>
          </button>
        </div>
      </header>
      {mode === "custom" && (
        <div className={styles.chartCustomRange}>
          <label className={styles.chartCustomField}>
            От
            <input
              type="date"
              value={customRange.from}
              onChange={(event) => setCustomRange((prev) => ({ ...prev, from: event.target.value }))}
              disabled={isPending}
            />
          </label>
          <label className={styles.chartCustomField}>
            До
            <input
              type="date"
              value={customRange.to}
              onChange={(event) => setCustomRange((prev) => ({ ...prev, to: event.target.value }))}
              disabled={isPending}
            />
          </label>
        </div>
      )}
      {error && <div className={styles.chartError}>{error}</div>}
      <div className={styles.chartBody}>
        <IncomeExpenseChart
          labels={chartData.labels}
          income={chartData.income}
          expense={chartData.expense}
          currency={currency}
        />
      </div>
    </section>
  );
}
