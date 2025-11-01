"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/components/transactions/Transactions.module.css";
import { formatMoney } from "@/lib/utils/format";

export type SummaryPreset = {
  key: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
  from: string; // ISO start (inclusive)
  to: string;   // ISO end (inclusive)
  prevIncomeMinor?: number;
  prevExpenseMinor?: number;
};

export default function SummaryWithPeriod({
  presets,
  defaultKey = "month",
}: {
  presets: SummaryPreset[];
  defaultKey?: string;
}) {
  const map = useMemo(() => Object.fromEntries(presets.map((p) => [p.key, p])), [presets]);
  const [key, setKey] = useState(defaultKey in map ? defaultKey : presets[0]?.key);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const cur = map[key];
  const net = (cur?.incomeMinor || 0) - (cur?.expenseMinor || 0);
  const prevInc = cur?.prevIncomeMinor ?? undefined;
  const prevExp = cur?.prevExpenseMinor ?? undefined;
  const prevNet = prevInc !== undefined && prevExp !== undefined ? prevInc - prevExp : undefined;

  function pctDelta(curr: number, prev?: number) {
    if (prev === undefined) return undefined;
    if (prev === 0) return undefined;
    return ((curr - prev) / prev) * 100;
  }
  const incPct = pctDelta(cur?.incomeMinor || 0, prevInc);
  const expPct = pctDelta(cur?.expenseMinor || 0, prevExp);
  const netPct = pctDelta(net, prevNet);

  function buildBadge(value: number | undefined, invert = false) {
    if (value === undefined) return { text: "Нет данных", variant: "neutral" as const };
    const abs = Math.abs(value).toFixed(1);
    if (abs === "0.0") return { text: "• 0.0%", variant: "neutral" as const };
    const up = value > 0;
    const arrow = up ? "↑" : "↓";
    const formatted = `${arrow} ${up ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
    const positive = invert ? !up : up;
    return { text: formatted, variant: positive ? "positive" : "negative" } as const;
  }

  const incomeBadge = buildBadge(incPct);
  const expenseBadge = buildBadge(expPct, true);
  const netBadge = buildBadge(netPct);
  // Build inclusive end date label (to is inclusive in presets)
  const fromD = cur?.from ? new Date(cur.from) : undefined;
  let toD = cur?.to ? new Date(cur.to) : undefined;
  if (fromD && toD) {
    const isMidnight =
      toD.getHours() === 0 &&
      toD.getMinutes() === 0 &&
      toD.getSeconds() === 0 &&
      toD.getMilliseconds() === 0;
    if (isMidnight && toD.getTime() > fromD.getTime()) {
      toD = new Date(toD.getTime() - 1);
    }
  }
  const fmt = (d?: Date) => {
    if (!d) return "";
    const parts = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    let month = parts.find((p) => p.type === "month")?.value ?? "";
    month = month.replace(".", "");
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return `${day} ${month} ${year}`;
  };

  // URL sync for summary period (top bar): s_period, s_from, s_to
  function updateSummaryUrl(next: Partial<Record<string, string>>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Do not override local selection from URL to avoid flicker

  // Custom period UI state (read from URL)
  const customFrom = sp.get("s_from") || "";
  const customTo = sp.get("s_to") || "";

  return (
    <>
      <div className={styles.periodBar}>
        <label className={styles.periodLabel} htmlFor="periodSelect">Период:</label>
        <select
          id="periodSelect"
          className={styles.periodSelect}
          value={key}
          onChange={(e) => {
            const v = e.target.value;
            setKey(v);
            if (v === "custom") {
              updateSummaryUrl({ s_period: "custom" });
            } else if (v === "month" || v === "prev" || v === "year") {
              // Do not update URL to avoid server remount flicker; rely on local state
            }
          }}
        >
          <option value="month">Этот месяц</option>
          <option value="prev">Прошлый месяц</option>
          <option value="year">Этот год</option>
          <option value="custom">Произвольный период</option>
        </select>

        {key === "custom" && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              className={styles.input}
              value={customFrom}
              onChange={(e) => updateSummaryUrl({ s_period: "custom", s_from: e.target.value })}
              placeholder="От"
            />
            <input
              type="date"
              className={styles.input}
              value={customTo}
              onChange={(e) => updateSummaryUrl({ s_period: "custom", s_to: e.target.value })}
              placeholder="До"
            />
          </div>
        )}
      </div>

      <div className={styles.summaryCaption}>
        {fmt(fromD)} — {fmt(toD)}
      </div>

      <section className={styles.topSummary}>
        <div className={`${styles.topSummaryCard} ${styles.topSummaryCardIncome}`}>
          <div className={styles.topSummaryContent}>
            <span className={styles.topSummaryTitle}>Общий доход</span>
            <span className={styles.topSummaryValue}>{formatMoney(cur?.incomeMinor || 0, cur?.currency || "RUB")}</span>
            <span className={`${styles.topSummaryBadge} ${incomeBadge.variant === "positive" ? styles.topSummaryBadgePositive : incomeBadge.variant === "negative" ? styles.topSummaryBadgeNegative : ""}`}>
              {incomeBadge.text}
            </span>
          </div>
        </div>
        <div className={`${styles.topSummaryCard} ${styles.topSummaryCardExpense}`}>
          <div className={styles.topSummaryContent}>
            <span className={styles.topSummaryTitle}>Общий расход</span>
            <span className={styles.topSummaryValue}>{formatMoney(cur?.expenseMinor || 0, cur?.currency || "RUB")}</span>
            <span className={`${styles.topSummaryBadge} ${expenseBadge.variant === "positive" ? styles.topSummaryBadgePositive : expenseBadge.variant === "negative" ? styles.topSummaryBadgeNegative : ""}`}>
              {expenseBadge.text}
            </span>
          </div>
        </div>
        <div className={`${styles.topSummaryCard} ${styles.topSummaryCardNet}`}>
          <div className={styles.topSummaryContent}>
            <span className={styles.topSummaryTitle}>Чистая прибыль</span>
            <span className={styles.topSummaryValue} style={{ color: net < 0 ? '#991b1b' : undefined }}>
              {formatMoney(net, cur?.currency || "RUB")}
            </span>
            <span className={`${styles.topSummaryBadge} ${netBadge.variant === "positive" ? styles.topSummaryBadgePositive : netBadge.variant === "negative" ? styles.topSummaryBadgeNegative : ""}`}>
              {netBadge.text}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
