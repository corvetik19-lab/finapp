import { createRSCClient } from "@/lib/supabase/helpers";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export type CategorySummaryPeriod = "week" | "month" | "year" | "custom";

export type CategorySummaryParams = {
  period?: CategorySummaryPeriod;
  from?: string;
  to?: string;
  limit?: number;
};

export type CategorySummaryItem = {
  id: string;
  name: string;
  kind: "income" | "expense" | "both";
  totalMinor: number;
  transactionCount: number;
};

export type CategorySummaryResult = {
  items: CategorySummaryItem[];
  currency: string;
  from: string;
  to: string;
};

export type CategoryTransactionItem = {
  id: string;
  occurredAt: string;
  amountMinor: number;
  currency: string;
  direction: "income" | "expense" | "transfer";
  note: string | null;
  counterparty: string | null;
  accountName: string | null;
};

export type CategoryTransactionsParams = {
  categoryId: string;
  from: string;
  to: string;
  limit?: number;
};

type TransactionsRow = {
  amount: number | bigint | null;
  currency: string | null;
  direction: "income" | "expense" | "transfer" | null;
  occurred_at: string;
  category:
    | null
    | {
        id: string;
        name: string | null;
        kind: "income" | "expense" | "transfer" | null;
      }
    | Array<{
        id: string;
        name: string | null;
        kind: "income" | "expense" | "transfer" | null;
      }>
    | undefined;
};

type TransactionWithAccountRow = {
  id: string;
  occurred_at: string;
  amount: number | bigint | null;
  currency: string | null;
  direction: "income" | "expense" | "transfer" | null;
  note: string | null;
  counterparty: string | null;
  account:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null
    | undefined;
};

function resolveRange(params: CategorySummaryParams): { from: string; to: string; period: CategorySummaryPeriod } {
  const now = new Date();
  const period = params.period ?? "month";

  if (period === "custom") {
    const from = params.from ? new Date(params.from) : null;
    const to = params.to ? new Date(params.to) : null;
    if (!from || Number.isNaN(from.getTime()) || !to || Number.isNaN(to.getTime())) {
      throw new Error("Некорректный период для пользовательского диапазона");
    }
    const fromISO = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())).toISOString();
    const toISO = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999)).toISOString();
    return { from: fromISO, to: toISO, period };
  }

  if (period === "week") {
    const start = new Date(now.getTime() - 6 * MS_IN_DAY);
    const fromISO = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())).toISOString();
    const toISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
    return { from: fromISO, to: toISO, period };
  }

  if (period === "year") {
    const fromISO = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
    const toISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
    return { from: fromISO, to: toISO, period };
  }

  const fromISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const toISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
  return { from: fromISO, to: toISO, period };
}

function normalizeCategory(
  raw: TransactionsRow["category"]
): { id: string; name: string; kind: "income" | "expense" | "transfer" } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || !first.id) return null;
    return {
      id: first.id,
      name: first.name ?? "Без категории",
      kind: (first.kind ?? "expense") as "income" | "expense" | "transfer",
    };
  }
  if (!raw.id) return null;
  return {
    id: raw.id,
    name: raw.name ?? "Без категории",
    kind: (raw.kind ?? "expense") as "income" | "expense" | "transfer",
  };
}

export async function loadCategorySummary(params: CategorySummaryParams = {}): Promise<CategorySummaryResult> {
  const { from, to } = resolveRange(params);
  const limit = params.limit ?? 6;

  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("amount,currency,direction,occurred_at,category:categories(id,name,kind)")
    .gte("occurred_at", from)
    .lte("occurred_at", to)
    .not("category_id", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const rows = (data ?? []) as TransactionsRow[];

  const currency = rows[0]?.currency ?? "RUB";
  const aggregation = new Map<string, CategorySummaryItem & { totalMinor: number; hasIncome: boolean; hasExpense: boolean }>();

  for (const row of rows) {
    const category = normalizeCategory(row.category);
    if (!category) continue;
    if (row.direction !== "income" && row.direction !== "expense") continue;

    // Доходы - положительные, расходы - отрицательные
    const amountMinor = Number(row.amount ?? 0);
    const signedAmount = row.direction === "income" ? Math.abs(amountMinor) : -Math.abs(amountMinor);
    
    if (!aggregation.has(category.id)) {
      aggregation.set(category.id, {
        id: category.id,
        name: category.name,
        kind: category.kind === "income" ? "income" : "expense",
        totalMinor: 0,
        transactionCount: 0,
        hasIncome: false,
        hasExpense: false,
      });
    }
    const entry = aggregation.get(category.id)!;
    entry.totalMinor += signedAmount;
    entry.transactionCount += 1;
    
    // Отслеживаем наличие доходов и расходов
    if (row.direction === "income") {
      entry.hasIncome = true;
    } else if (row.direction === "expense") {
      entry.hasExpense = true;
    }
    
    // Определяем kind на основе фактических транзакций
    if (entry.hasIncome && entry.hasExpense) {
      entry.kind = "both";
    } else if (entry.hasIncome) {
      entry.kind = "income";
    } else if (entry.hasExpense) {
      entry.kind = "expense";
    }
  }

  const items = Array.from(aggregation.values())
    .sort((a, b) => Math.abs(b.totalMinor) - Math.abs(a.totalMinor))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      totalMinor: item.totalMinor,
      transactionCount: item.transactionCount,
    }));

  return {
    items,
    currency,
    from,
    to,
  };
}

export async function loadCategoryTransactions(
  params: CategoryTransactionsParams
): Promise<CategoryTransactionItem[]> {
  const { categoryId, from, to, limit = 50 } = params;

  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,note,counterparty,account:accounts!transactions_account_id_fkey(name)")
    .eq("category_id", categoryId)
    .gte("occurred_at", from)
    .lte("occurred_at", to)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TransactionWithAccountRow[];

  return rows.map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] ?? null : row.account ?? null;

    return {
      id: row.id,
      occurredAt: row.occurred_at,
      amountMinor: Math.abs(Number(row.amount ?? 0)),
      currency: row.currency ?? "RUB",
      direction: (row.direction ?? "expense") as "income" | "expense" | "transfer",
      note: row.note,
      counterparty: row.counterparty ?? null,
      accountName: account?.name ?? null,
    } satisfies CategoryTransactionItem;
  });
}
