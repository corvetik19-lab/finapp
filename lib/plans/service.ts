import type { SupabaseClient } from "@supabase/supabase-js";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";

export type PlanSelectItem = {
  id: string;
  label: string;
  title: string;
  deadline: string | null;
};

export type ListPlansForSelectParams = {
  limit?: number;
  search?: string;
  ids?: string[];
};

type PlanSelectRow = Record<string, unknown> & { id: string };

const planAmountFormatterCache = new Map<string, Intl.NumberFormat>();

function ensureString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function ensureNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = Number.parseFloat(value);
    if (!Number.isNaN(normalized)) {
      return normalized;
    }
  }
  return null;
}

function formatPlanAmount(valueMinor: number | null, currency: string | null): string | null {
  if (valueMinor === null) return null;
  const safeCurrency = currency && currency.trim().length === 3 ? currency.trim().toUpperCase() : "RUB";
  let formatter = planAmountFormatterCache.get(safeCurrency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2,
    });
    planAmountFormatterCache.set(safeCurrency, formatter);
  }
  return formatter.format(valueMinor / 100);
}

function pickPlanTitle(row: PlanSelectRow): string {
  const title = ensureString(row.title);
  if (title) return title;
  const name = ensureString(row.name);
  if (name) return name;
  const description = ensureString(row.description);
  if (description) return description.length > 60 ? `${description.slice(0, 57)}…` : description;
  return "План без названия";
}

function pickPlanDeadline(row: PlanSelectRow): string | null {
  return (
    ensureString(row.deadline) ||
    ensureString(row.due_date) ||
    ensureString(row.target_date) ||
    null
  );
}

function buildPlanLabel(row: PlanSelectRow): { label: string; title: string; deadline: string | null } {
  const title = pickPlanTitle(row);
  const deadline = pickPlanDeadline(row);

  const currency = ensureString(row.currency) || "RUB";
  const targetAmount = ensureNumber(row.target_amount) ?? ensureNumber(row.goal_amount);
  const currentAmount = ensureNumber(row.current_amount) ?? ensureNumber(row.saved_amount);

  const targetFormatted = formatPlanAmount(targetAmount ?? null, currency);
  const currentFormatted = formatPlanAmount(currentAmount ?? null, currency);

  const parts = [title];
  if (deadline) {
    parts.push(`до ${deadline}`);
  }
  if (targetFormatted) {
    if (currentFormatted) {
      parts.push(`${currentFormatted} из ${targetFormatted}`);
    } else {
      parts.push(`цель ${targetFormatted}`);
    }
  }

  return {
    label: parts.join(" • "),
    title,
    deadline,
  };
}

type SupabaseClientLike =
  | Awaited<ReturnType<typeof createRSCClient>>
  | Awaited<ReturnType<typeof createRouteClient>>;

async function queryPlansForSelect(
  client: SupabaseClientLike,
  params: ListPlansForSelectParams = {}
): Promise<PlanSelectItem[]> {
  const { limit = 20, search, ids } = params;

  const fetchLimit = search ? Math.max(limit, 50) : limit;

  let query = client
    .from("plans")
    .select("*")
    .order("updated_at", { ascending: false });

  if (ids && ids.length > 0) {
    query = query.in("id", ids).limit(ids.length);
  } else {
    query = query.limit(fetchLimit);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as PlanSelectRow[];

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const title = pickPlanTitle(row).toLowerCase();
      const description = ensureString(row.description)?.toLowerCase() ?? "";
      return title.includes(term) || description.includes(term);
    });
  }

  const mapped = rows.slice(0, limit).map((row) => {
    const { label, title, deadline } = buildPlanLabel(row);
    return {
      id: row.id,
      label,
      title,
      deadline,
    } satisfies PlanSelectItem;
  });

  if (ids && ids.length > 0) {
    const lookup = new Map(mapped.map((item) => [item.id, item]));
    return ids
      .map((id) => lookup.get(id))
      .filter((item): item is PlanSelectItem => Boolean(item));
  }

  return mapped;
}

export async function listPlansForSelect(
  params: ListPlansForSelectParams = {}
): Promise<PlanSelectItem[]> {
  const supabase = await createRSCClient();
  return queryPlansForSelect(supabase, params);
}

export async function listPlansForSelectRoute(
  params: ListPlansForSelectParams = {}
): Promise<PlanSelectItem[]> {
  const supabase = await createRouteClient();
  return queryPlansForSelect(supabase, params);
}

export type PlanActivityItem = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "topup" | "withdraw";
};

export type PlanWithActivity = {
  id: string;
  name: string;
  goalAmount: number;
  currentAmount: number;
  targetDate: string | null;
  category: string;
  account: string;
  monthlyContribution: number;
  status: "active" | "ahead" | "behind";
  description: string;
  createdAt: string | null;
  currency: string;
  activity: PlanActivityItem[];
};

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  goal_amount: number;
  current_amount: number;
  monthly_contribution: number;
  currency: string;
  target_date: string | null;
  status: string;
  created_at: string | null;
  plan_type: {
    id: string;
    name: string;
  } | null;
  account: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  plan_topups: {
    id: string;
    amount: number;
    type: "topup" | "withdrawal" | null;
    description: string | null;
    occurred_at: string | null;
  }[] | null;
};

function computeStatus(row: PlanRow, goalAmountMinor: number, currentAmountMinor: number): "active" | "ahead" | "behind" {
  if (goalAmountMinor <= 0) {
    return currentAmountMinor >= 0 ? "active" : "behind";
  }

  const now = Date.now();
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : null;
  const targetAt = row.target_date ? new Date(row.target_date).getTime() : null;

  if (!createdAt || !targetAt || targetAt <= createdAt) {
    return currentAmountMinor >= goalAmountMinor ? "ahead" : "active";
  }

  if (now >= targetAt) {
    return currentAmountMinor >= goalAmountMinor ? "ahead" : "behind";
  }

  const totalDuration = targetAt - createdAt;
  const elapsed = now - createdAt;
  const expectedProgress = (goalAmountMinor * elapsed) / totalDuration;
  const tolerance = goalAmountMinor * 0.1;

  if (currentAmountMinor >= expectedProgress + tolerance) {
    return "ahead";
  }
  if (currentAmountMinor + tolerance < expectedProgress) {
    return "behind";
  }
  return "active";
}

function mapPlanRow(row: PlanRow): PlanWithActivity {
  const goalAmountMinor = row.goal_amount ?? 0;
  const currentAmountMinor = row.current_amount ?? 0;
  const monthlyContributionMinor = row.monthly_contribution ?? 0;

  const activityItems: PlanActivityItem[] = (row.plan_topups ?? []).map((item) => {
    const amountMinor = item.amount ?? 0;
    const amountMajor = amountMinor / 100;
    const occurredAt = item.occurred_at ? new Date(item.occurred_at).toISOString() : new Date().toISOString();
    const type = item.type === "withdrawal" ? "withdraw" : "topup";

    return {
      id: item.id,
      date: occurredAt,
      description: item.description ?? "Взнос по плану",
      amount: amountMajor,
      type,
    } satisfies PlanActivityItem;
  });

  const status = (row.status === "ahead" || row.status === "behind" || row.status === "active"
    ? row.status
    : computeStatus(row, goalAmountMinor, currentAmountMinor)) as "active" | "ahead" | "behind";

  return {
    id: row.id,
    name: row.name,
    goalAmount: goalAmountMinor / 100,
    currentAmount: currentAmountMinor / 100,
    targetDate: row.target_date,
    category: row.category?.name ?? row.plan_type?.name ?? "—",
    account: row.account?.name ?? "—",
    monthlyContribution: monthlyContributionMinor / 100,
    status,
    description: row.description ?? "",
    createdAt: row.created_at,
    currency: row.currency ?? "RUB",
    activity: activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  } satisfies PlanWithActivity;
}

export async function listPlansWithActivity(): Promise<PlanWithActivity[]> {
  const supabase = (await createRSCClient()) as SupabaseClient;
  if (typeof supabase?.from !== "function") {
    return [];
  }

  const { data, error } = await supabase
    .from("plans")
    .select(
      `
        id,
        name,
        description,
        goal_amount,
        current_amount,
        monthly_contribution,
        currency,
        target_date,
        status,
        created_at,
        plan_type:plan_types(id, name),
        account:accounts(id, name),
        category:categories(id, name),
        plan_topups(
          id,
          amount,
          type,
          description,
          occurred_at
        )
      `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listPlansWithActivity", error);
    return [];
  }

  const rows = (data ?? []) as unknown as PlanRow[];
  return rows.map(mapPlanRow);
}
