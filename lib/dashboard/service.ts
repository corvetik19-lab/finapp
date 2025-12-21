import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentCompanyId } from "@/lib/platform/organization";

const MONTH_LABELS_RU_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function formatMonthLabel(date: Date) {
  return `${MONTH_LABELS_RU_SHORT[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(-2)}`;
}

export type DashboardTrendPoint = {
  label: string;
  income: number;
  expense: number;
};

export type DashboardBreakdownPoint = {
  category: string;
  amount: number;
  percent: number;
};

export type DashboardOverview = {
  currency: string;
  trend: DashboardTrendPoint[];
  breakdown: DashboardBreakdownPoint[];
  topIncome: number;
  topExpense: number;
  net: number;
  range: {
    from: string;
    to: string;
  };
};

const toMajor = (valueMinor: number | bigint | null | undefined) => Number(valueMinor ?? 0) / 100;

type SupabaseDashboardRow = {
  occurred_at: string;
  amount: number | bigint;
  currency: string;
  direction: "income" | "expense" | "transfer";
  category_id: string | null;
  category:
    | null
    | { id: string; name: string }[]
    | {
        id: string;
        name: string;
      };
};

export type DashboardOverviewOptions = {
  from?: string;
  to?: string;
};

export async function loadDashboardOverview(monthsBack = 8, options?: DashboardOverviewOptions): Promise<DashboardOverview> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const now = new Date();

  const hasCustomRange = Boolean(options?.from && options?.to);

  const startDate = hasCustomRange
    ? new Date(options!.from!)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
  const endDate = hasCustomRange ? new Date(options!.to!) : now;

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid date range provided to loadDashboardOverview");
  }

  const startBound = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const endBound = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999));

  let query = supabase
    .from("transactions")
    .select("occurred_at,amount,currency,direction,category_id,category:categories(id,name)")
    .gte("occurred_at", startBound.toISOString())
    .lte("occurred_at", endBound.toISOString())
    .order("occurred_at", { ascending: true })
    .limit(2000);

  // Фильтруем по company_id если есть
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data ?? []) as SupabaseDashboardRow[];
  const trendMap = new Map<string, DashboardTrendPoint>();
  const breakdownMap = new Map<string, number>();

  const totalMonths = Math.max(
    1,
    (endBound.getUTCFullYear() - startBound.getUTCFullYear()) * 12 + (endBound.getUTCMonth() - startBound.getUTCMonth()) + 1
  );

  for (let i = 0; i < totalMonths; i += 1) {
    const d = new Date(Date.UTC(startBound.getUTCFullYear(), startBound.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, { label: formatMonthLabel(d), income: 0, expense: 0 });
  }

  const currency = rows[0]?.currency ?? "RUB";

  for (const row of rows) {
    const occurredAt = new Date(row.occurred_at);
    const monthKey = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const amountMajor = toMajor(row.amount);
    const trendPoint = trendMap.get(monthKey);
    if (trendPoint) {
      if (row.direction === "income") trendPoint.income += amountMajor;
      if (row.direction === "expense") {
        trendPoint.expense += Math.abs(amountMajor);
      }
    }

    // Breakdown считаем только за текущий месяц (как и topIncome/topExpense)
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const isCurrentMonth = occurredAt >= currentMonthStart && occurredAt <= endBound;
    
    if (row.direction === "expense" && isCurrentMonth) {
      const categoryField = row.category;
      const categoryName = Array.isArray(categoryField)
        ? categoryField[0]?.name ?? "Без категории"
        : categoryField?.name ?? "Без категории";
      breakdownMap.set(categoryName, (breakdownMap.get(categoryName) ?? 0) + Math.abs(amountMajor));
    }
  }

  const trend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, point]) => ({
      label: point.label,
      income: Number(point.income.toFixed(2)),
      expense: Number(point.expense.toFixed(2)),
    }));

  const latest = trend[trend.length - 1] ?? { income: 0, expense: 0, label: "" };
  const net = Number((latest.income - latest.expense).toFixed(2));

  const breakdownEntries = Array.from(breakdownMap.entries()).sort((a, b) => b[1] - a[1]);
  const totalExpense = breakdownEntries.reduce((sum, [, value]) => sum + value, 0);

  const breakdown = breakdownEntries.slice(0, 5).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2)),
    percent: totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0,
  }));

  if (breakdownEntries.length > 5) {
    const otherTotal = breakdownEntries.slice(5).reduce((sum, [, value]) => sum + value, 0);
    if (otherTotal > 0) {
      breakdown.push({
        category: "Остальное",
        amount: Number(otherTotal.toFixed(2)),
        percent: totalExpense > 0 ? Number(((otherTotal / totalExpense) * 100).toFixed(1)) : 0,
      });
    }
  }

  return {
    currency,
    trend,
    breakdown,
    topIncome: Number(latest.income.toFixed(2)),
    topExpense: Number(latest.expense.toFixed(2)),
    net,
    range: {
      from: startBound.toISOString(),
      to: endBound.toISOString(),
    },
  };
}
