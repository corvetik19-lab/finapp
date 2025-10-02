"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import ExpenseBreakdownDonut from "@/components/reports/ExpenseBreakdownDonut";
import styles from "@/components/dashboard/Dashboard.module.css";
import type { DashboardBreakdownPoint } from "@/lib/dashboard/service";
import { formatMoney } from "@/lib/utils/format";
import { loadExpenseBreakdownAction } from "@/app/(protected)/dashboard/actions";

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
  const [selectedMonths, setSelectedMonths] = useState(12);
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

  const handlePeriodChange = (event: ChangeEvent<HTMLSelectElement>) => {
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
    <section className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <div>
          <div className={styles.chartTitle}>Расходы по категориям</div>
          <div className={styles.chartSubtitle}>Топ категорий, % распределения</div>
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

      {hasData ? (
        <>
          <div className={styles.donutWrapper}>
            <ExpenseBreakdownDonut
              labels={chartData.breakdown.map((item) => item.category)}
              values={chartData.breakdown.map((item) => item.amount)}
              currency={chartData.currency}
            />
          </div>
          <div className={styles.breakdownLegend}>
            {chartData.breakdown.map((item) => (
              <div key={item.category} className={styles.breakdownLegendItem}>
                <div className={styles.breakdownLegendInfo}>
                  <span className={styles.breakdownLegendTitle}>{item.category}</span>
                  <span className={styles.breakdownLegendMeta}>{item.percent.toFixed(1)}% от расходов периода</span>
                </div>
                <span className={styles.breakdownLegendAmount}>
                  {formatMoney(Math.round(item.amount * 100), chartData.currency)}
                </span>
              </div>
            ))}
            <div className={styles.breakdownLegendMeta}>
              Период: {periodLabel}
            </div>
            <div className={styles.breakdownLegendMeta}>
              Всего расходов: {formatMoney(Math.round(chartData.total * 100), chartData.currency)}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.breakdownEmpty}>Нет расходов за выбранный период.</div>
      )}
    </section>
  );
}
