import { createRSCClient } from "@/lib/supabase/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BudgetRow = {
  id: string;
  category_id: string | null;
  period_start: string;
  period_end: string;
  limit_amount: number;
  currency: string;
  category: {
    id: string;
    name: string;
    kind: "income" | "expense" | "transfer";
  } | null;
};

export type BudgetWithUsage = {
  id: string;
  category_id: string | null;
  period_start: string;
  period_end: string;
  limit_minor: number;
  limit_major: number;
  currency: string;
  category: BudgetRow["category"];
  spent_minor: number;
  spent_major: number;
  remaining_minor: number;
  remaining_major: number;
  progress: number;
  status: "ok" | "warning" | "over";
};

function endOfDay(date: string) {
  const end = new Date(`${date}T23:59:59.999Z`);
  return end.toISOString();
}

function startOfDay(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  return start.toISOString();
}

function normalizeBudgetRecord(record: Record<string, unknown>): BudgetRow {
  const categoryField = record.category as unknown;
  const categoryValue = Array.isArray(categoryField)
    ? (categoryField[0] as Record<string, unknown> | undefined)
    : (categoryField as Record<string, unknown> | undefined);

  return {
    id: String(record.id ?? ""),
    category_id: record.category_id ? String(record.category_id) : null,
    period_start: String(record.period_start ?? ""),
    period_end: String(record.period_end ?? ""),
    limit_amount: Number(record.limit_amount ?? 0),
    currency: String(record.currency ?? "RUB"),
    category: categoryValue
      ? {
          id: String(categoryValue.id ?? ""),
          name: String(categoryValue.name ?? ""),
          kind: String(categoryValue.kind ?? "expense") as "income" | "expense" | "transfer",
        }
      : null,
  } satisfies BudgetRow;
}

async function enrichBudgetWithUsage(
  supabase: SupabaseClient,
  budget: BudgetRow
): Promise<BudgetWithUsage> {
  const limitMinor = Number(budget.limit_amount ?? 0);

  if (!budget.category_id) {
    const remainingMinor = limitMinor;
    return {
      id: budget.id,
      category_id: null,
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_minor: limitMinor,
      limit_major: limitMinor / 100,
      currency: budget.currency,
      category: budget.category,
      spent_minor: 0,
      spent_major: 0,
      remaining_minor: remainingMinor,
      remaining_major: remainingMinor / 100,
      progress: 0,
      status: "ok",
    } satisfies BudgetWithUsage;
  }

  // Определяем direction на основе типа категории
  const direction = budget.category?.kind === "income" ? "income" : "expense";
  
  const { data: txRows, error: txError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("category_id", budget.category_id)
    .eq("direction", direction)
    .gte("occurred_at", startOfDay(budget.period_start))
    .lte("occurred_at", endOfDay(budget.period_end));

  if (txError) throw txError;

  const transactions = Array.isArray(txRows) ? txRows : [];
  const spentMinor = transactions.reduce((acc, row) => acc + Math.abs(Number((row as { amount?: number }).amount ?? 0)), 0);
  
  // Для доходов: remaining = actual - limit (сколько больше заработали)
  // Для расходов: remaining = limit - spent (сколько осталось)
  const remainingMinor = direction === "income" 
    ? spentMinor - limitMinor 
    : limitMinor - spentMinor;
    
  const progressRatio = limitMinor > 0 ? spentMinor / limitMinor : 0;
  const clampedProgress = Math.max(0, progressRatio);
  
  // Для доходов: "ok" если выполнили план
  // Для расходов: "over" если потратили больше лимита (плохо)
  let status: BudgetWithUsage["status"];
  if (direction === "income") {
    // Для доходов: ok = план выполнен, warning = близко к плану, over = план превышен (это хорошо)
    status = spentMinor >= limitMinor ? "ok" : clampedProgress >= 0.85 ? "warning" : "warning";
  } else {
    status = remainingMinor < 0 ? "over" : clampedProgress >= 0.85 ? "warning" : "ok";
  }

  return {
    id: budget.id,
    category_id: budget.category_id,
    period_start: budget.period_start,
    period_end: budget.period_end,
    limit_minor: limitMinor,
    limit_major: limitMinor / 100,
    currency: budget.currency,
    category: budget.category,
    spent_minor: spentMinor,
    spent_major: spentMinor / 100,
    remaining_minor: remainingMinor,
    remaining_major: remainingMinor / 100,
    progress: clampedProgress,
    status,
  } satisfies BudgetWithUsage;
}

const commonSelect =
  "id,category_id,period_start,period_end,limit_amount,currency,category:categories(id,name,kind)";

export async function listBudgetsWithUsage(): Promise<BudgetWithUsage[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(commonSelect)
    .order("period_start", { ascending: false });

  if (error) throw error;

  const rawRows = Array.isArray(data) ? data : [];
  const budgets = rawRows.map((row) => normalizeBudgetRecord(row as Record<string, unknown>));

  return Promise.all(budgets.map((budget) => enrichBudgetWithUsage(supabase, budget)));
}

export async function getBudgetWithUsage(id: string): Promise<BudgetWithUsage | null> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(commonSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const budget = normalizeBudgetRecord(data as Record<string, unknown>);
  return enrichBudgetWithUsage(supabase, budget);
}
