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
