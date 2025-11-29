import { createRSCClient } from "@/lib/supabase/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export type BudgetRow = {
  id: string;
  category_id: string | null;
  account_id: string | null;
  period_start: string;
  period_end: string;
  limit_amount: number;
  currency: string;
  notes: string | null;
  category: {
    id: string;
    name: string;
    kind: "income" | "expense" | "transfer" | "both";
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
};

export type BudgetWithUsage = {
  id: string;
  category_id: string | null;
  account_id: string | null;
  period_start: string;
  period_end: string;
  limit_minor: number;
  limit_major: number;
  currency: string;
  notes: string | null;
  category: BudgetRow["category"];
  account: BudgetRow["account"];
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

  const accountField = record.account as unknown;
  const accountValue = Array.isArray(accountField)
    ? (accountField[0] as Record<string, unknown> | undefined)
    : (accountField as Record<string, unknown> | undefined);

  return {
    id: String(record.id ?? ""),
    category_id: record.category_id ? String(record.category_id) : null,
    account_id: record.account_id ? String(record.account_id) : null,
    period_start: String(record.period_start ?? ""),
    period_end: String(record.period_end ?? ""),
    limit_amount: Number(record.limit_amount ?? 0),
    currency: String(record.currency ?? "RUB"),
    notes: record.notes ? String(record.notes) : null,
    category: categoryValue
      ? {
          id: String(categoryValue.id ?? ""),
          name: String(categoryValue.name ?? ""),
          kind: String(categoryValue.kind ?? "expense") as "income" | "expense" | "transfer" | "both",
        }
      : null,
    account: accountValue
      ? {
          id: String(accountValue.id ?? ""),
          name: String(accountValue.name ?? ""),
          type: String(accountValue.type ?? ""),
        }
      : null,
  } satisfies BudgetRow;
}

async function enrichBudgetWithUsage(
  supabase: SupabaseClient,
  budget: BudgetRow
): Promise<BudgetWithUsage> {
  const limitMinor = Number(budget.limit_amount ?? 0);

  // Если это бюджет для счета (кредитной карты)
  if (budget.account_id && !budget.category_id) {
    const { data: txRows } = await supabase
      .from("transactions")
      .select("amount")
      .eq("account_id", budget.account_id)
      .eq("direction", "expense")
      .gte("occurred_at", startOfDay(budget.period_start))
      .lte("occurred_at", endOfDay(budget.period_end));

    const transactions = Array.isArray(txRows) ? txRows : [];
    const spentMinor = transactions.reduce((acc, row) => acc + Math.abs(Number((row as { amount?: number }).amount ?? 0)), 0);
    
    const remainingMinor = limitMinor - spentMinor;
    const progressRatio = limitMinor > 0 ? spentMinor / limitMinor : 0;
    const clampedProgress = Math.max(0, progressRatio);
    
    const status: BudgetWithUsage["status"] = 
      remainingMinor < 0 ? "over" : clampedProgress >= 0.85 ? "warning" : "ok";

    return {
      id: budget.id,
      category_id: null,
      account_id: budget.account_id,
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_minor: limitMinor,
      limit_major: limitMinor / 100,
      currency: budget.currency,
      notes: budget.notes,
      category: budget.category,
      account: budget.account,
      spent_minor: spentMinor,
      spent_major: spentMinor / 100,
      remaining_minor: remainingMinor,
      remaining_major: remainingMinor / 100,
      progress: clampedProgress,
      status,
    } satisfies BudgetWithUsage;
  }

  if (!budget.category_id) {
    const remainingMinor = limitMinor;
    return {
      id: budget.id,
      category_id: null,
      account_id: null,
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_minor: limitMinor,
      limit_major: limitMinor / 100,
      currency: budget.currency,
      notes: budget.notes,
      category: budget.category,
      account: null,
      spent_minor: 0,
      spent_major: 0,
      remaining_minor: remainingMinor,
      remaining_major: remainingMinor / 100,
      progress: 0,
      status: "ok",
    } satisfies BudgetWithUsage;
  }

  const categoryKind = budget.category?.kind;
  let spentMinor = 0;
  
  // Для категорий 'both' считаем чистую прибыль (доходы - расходы)
  if (categoryKind === "both") {
    // Получаем доходы
    const { data: incomeRows } = await supabase
      .from("transactions")
      .select("amount")
      .eq("category_id", budget.category_id)
      .eq("direction", "income")
      .gte("occurred_at", startOfDay(budget.period_start))
      .lte("occurred_at", endOfDay(budget.period_end));
    
    // Получаем расходы
    const { data: expenseRows } = await supabase
      .from("transactions")
      .select("amount")
      .eq("category_id", budget.category_id)
      .eq("direction", "expense")
      .gte("occurred_at", startOfDay(budget.period_start))
      .lte("occurred_at", endOfDay(budget.period_end));
    
    const incomeTotal = (incomeRows ?? []).reduce((acc, row) => acc + Math.abs(Number((row as { amount?: number }).amount ?? 0)), 0);
    const expenseTotal = (expenseRows ?? []).reduce((acc, row) => acc + Math.abs(Number((row as { amount?: number }).amount ?? 0)), 0);
    
    // Чистая прибыль = доходы - расходы
    spentMinor = incomeTotal - expenseTotal;
  } else {
    // Для обычных категорий
    const direction = categoryKind === "income" ? "income" : "expense";
    
    const { data: txRows, error: txError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("category_id", budget.category_id)
      .eq("direction", direction)
      .gte("occurred_at", startOfDay(budget.period_start))
      .lte("occurred_at", endOfDay(budget.period_end));

    if (txError) throw txError;

    const transactions = Array.isArray(txRows) ? txRows : [];
    spentMinor = transactions.reduce((acc, row) => acc + Math.abs(Number((row as { amount?: number }).amount ?? 0)), 0);
  }
  
  // Для доходов и both: remaining = actual - limit (сколько больше заработали/недобор)
  // Для расходов: remaining = limit - spent (сколько осталось)
  const remainingMinor = (categoryKind === "income" || categoryKind === "both")
    ? spentMinor - limitMinor 
    : limitMinor - spentMinor;
    
  const progressRatio = limitMinor > 0 ? spentMinor / limitMinor : 0;
  const clampedProgress = Math.max(0, progressRatio);
  
  // Статус для доходов/both и расходов
  let status: BudgetWithUsage["status"];
  if (categoryKind === "income" || categoryKind === "both") {
    // Для доходов/both: ok = план выполнен (100%+), warning = близко
    status = spentMinor >= limitMinor ? "ok" : clampedProgress >= 0.85 ? "warning" : "warning";
  } else {
    // Для расходов: over = превышен лимит, warning = близко к лимиту
    status = remainingMinor < 0 ? "over" : clampedProgress >= 0.85 ? "warning" : "ok";
  }

  return {
    id: budget.id,
    category_id: budget.category_id,
    account_id: null,
    period_start: budget.period_start,
    period_end: budget.period_end,
    limit_minor: limitMinor,
    limit_major: limitMinor / 100,
    currency: budget.currency,
    notes: budget.notes,
    category: budget.category,
    account: null,
    spent_minor: spentMinor,
    spent_major: spentMinor / 100,
    remaining_minor: remainingMinor,
    remaining_major: remainingMinor / 100,
    progress: clampedProgress,
    status,
  } satisfies BudgetWithUsage;
}

const commonSelect =
  "id,category_id,account_id,period_start,period_end,limit_amount,currency,notes,category:categories(id,name,kind),account:accounts(id,name,type)";

export async function listBudgetsWithUsage(): Promise<BudgetWithUsage[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  let query = supabase
    .from("budgets")
    .select(commonSelect)
    .order("period_start", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

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
