"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Период:</span>
        <Select value={key} onValueChange={(v) => { setKey(v); if (v === "custom") updateSummaryUrl({ s_period: "custom" }); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="month">Этот месяц</SelectItem><SelectItem value="prev">Прошлый месяц</SelectItem><SelectItem value="year">Этот год</SelectItem><SelectItem value="custom">Произвольный</SelectItem></SelectContent>
        </Select>
        {key === "custom" && (<div className="flex gap-2"><Input type="date" className="w-36" value={customFrom} onChange={(e) => updateSummaryUrl({ s_period: "custom", s_from: e.target.value })} /><Input type="date" className="w-36" value={customTo} onChange={(e) => updateSummaryUrl({ s_period: "custom", s_to: e.target.value })} /></div>)}
        <span className="text-sm text-muted-foreground">{fmt(fromD)} — {fmt(toD)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm mb-1">
              <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-muted-foreground">Общий доход</span>
            </div>
            <div className="text-2xl font-bold">{formatMoney(cur?.incomeMinor || 0, cur?.currency || "RUB")}</div>
            <div className={cn("text-sm", incomeBadge.variant === "positive" ? "text-green-600" : incomeBadge.variant === "negative" ? "text-red-600" : "text-muted-foreground")}>{incomeBadge.text}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm mb-1">
              <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-muted-foreground">Общий расход</span>
            </div>
            <div className="text-2xl font-bold">{formatMoney(cur?.expenseMinor || 0, cur?.currency || "RUB")}</div>
            <div className={cn("text-sm", expenseBadge.variant === "positive" ? "text-green-600" : expenseBadge.variant === "negative" ? "text-red-600" : "text-muted-foreground")}>{expenseBadge.text}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm mb-1">
              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-muted-foreground">Чистая прибыль</span>
            </div>
            <div className={cn("text-2xl font-bold", net < 0 && "text-red-600")}>{formatMoney(net, cur?.currency || "RUB")}</div>
            <div className={cn("text-sm", netBadge.variant === "positive" ? "text-green-600" : netBadge.variant === "negative" ? "text-red-600" : "text-muted-foreground")}>{netBadge.text}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
