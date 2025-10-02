import { z } from "zod";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { transactionSchema, transferSchema, type TransferInput as TransferInputSchemaType } from "@/lib/validation/transaction";

export type TransactionDirection = "income" | "expense" | "transfer";

export type TransactionRecord = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  direction: TransactionDirection;
  amount: number; // stored in minor units (копейки)
  currency: string;
  occurred_at: string;
  note: string | null;
  counterparty: string | null;
  attachment_count?: number | null;
  tags?: unknown;
  created_at?: string;
  updated_at?: string;
  transfer_id?: string | null;
  transfer_role?: "expense" | "income" | null;
};

type TransactionSelectRow = Pick<
  TransactionRecord,
  "id" | "amount" | "currency" | "direction" | "occurred_at" | "note" | "counterparty"
>;

export type TransactionSelectItem = {
  id: string;
  label: string;
  direction: TransactionDirection;
  occurred_at: string;
};

export type ListTransactionsForSelectParams = {
  limit?: number;
  search?: string;
  ids?: string[];
};

const transactionSelectDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const transactionSelectAmountFormatterCache = new Map<string, Intl.NumberFormat>();

function formatTransactionAmount(amountMinor: number, currency: string) {
  const key = currency.toUpperCase();
  let formatter = transactionSelectAmountFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: key,
    });
    transactionSelectAmountFormatterCache.set(key, formatter);
  }
  return formatter.format(amountMinor / 100);
}

function buildTransactionSelectLabel(row: TransactionSelectRow): string {
  const date = (() => {
    try {
      return transactionSelectDateFormatter.format(new Date(row.occurred_at));
    } catch {
      return row.occurred_at;
    }
  })();

  const amount = formatTransactionAmount(row.amount, row.currency);
  const directionLabel =
    row.direction === "income" ? "Доход" : row.direction === "expense" ? "Расход" : "Перевод";
  const context = row.counterparty || row.note;
  return context ? `${date} • ${directionLabel} • ${amount} • ${context}` : `${date} • ${directionLabel} • ${amount}`;
}

function mapTransactionSelectRow(row: TransactionSelectRow): TransactionSelectItem {
  return {
    id: row.id,
    label: buildTransactionSelectLabel(row),
    direction: row.direction,
    occurred_at: row.occurred_at,
  };
}

type SupabaseClientLike =
  | Awaited<ReturnType<typeof createRSCClient>>
  | Awaited<ReturnType<typeof createRouteClient>>;

async function queryTransactionsForSelect(
  client: SupabaseClientLike,
  params: ListTransactionsForSelectParams = {}
): Promise<TransactionSelectItem[]> {
  const { limit = 20, search, ids } = params;

  let query = client
    .from("transactions")
    .select("id,amount,currency,direction,occurred_at,counterparty,note")
    .order("occurred_at", { ascending: false });

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.limit(limit);
  }

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`counterparty.ilike.${pattern},note.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as TransactionSelectRow[];
  const mapped = rows.map(mapTransactionSelectRow);

  if (ids && ids.length > 0) {
    const lookup = new Map(mapped.map((item) => [item.id, item]));
    return ids
      .map((id) => lookup.get(id))
      .filter((item): item is TransactionSelectItem => Boolean(item));
  }

  return mapped;
}

export async function listTransactionsForSelect(
  params: ListTransactionsForSelectParams = {}
): Promise<TransactionSelectItem[]> {
  const supabase = await createRSCClient();
  return queryTransactionsForSelect(supabase, params);
}

export async function listTransactionsForSelectRoute(
  params: ListTransactionsForSelectParams = {}
): Promise<TransactionSelectItem[]> {
  const supabase = await createRouteClient();
  return queryTransactionsForSelect(supabase, params);
}

export type TransactionListParams = {
  limit?: number;
  offset?: number;
  direction?: TransactionDirection | "all";
  accountIds?: string[];
  categoryIds?: string[];
  search?: string;
  minAmountMajor?: number;
  maxAmountMajor?: number;
  from?: string; // ISO date inclusive
  to?: string;   // ISO date inclusive
  orderBy?: "occurred_at" | "created_at" | "amount";
  orderDir?: "asc" | "desc";
};

export type TransferRecord = {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  expense_txn_id: string;
  income_txn_id: string;
  created_at?: string;
};

export type TransferListParams = {
  limit?: number;
  from?: string;
  to?: string;
  accountIds?: string[];
  minAmountMajor?: number;
  maxAmountMajor?: number;
  search?: string;
  orderDir?: "asc" | "desc";
};

const updateSchema = z.object({
  id: z.string().uuid(),
  payload: z
    .object({
      account_id: z.string().uuid().optional(),
      category_id: z.string().uuid().nullable().optional(),
      direction: z.enum(["income", "expense", "transfer"]).optional(),
      amount_major: z
        .preprocess(
          (v) => (typeof v === "string" ? v.replace(/,/g, ".") : v),
          z.coerce.number().positive("Сумма должна быть больше 0")
        )
        .optional(),
      currency: z.string().min(3).max(3).optional(),
      occurred_at: z.string().optional(),
      note: z.string().nullable().optional(),
      counterparty: z.string().nullable().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, "Нечего обновлять"),
});

export async function listTransactions(
  params: TransactionListParams = {},
  opts: { withCount?: boolean } = {}
): Promise<{ data: TransactionRecord[]; count?: number | null }> {
  const supabase = await createRSCClient();
  const {
    limit = 100,
    offset = 0,
    direction,
    accountIds,
    categoryIds,
    search,
    minAmountMajor,
    maxAmountMajor,
    from,
    to,
    orderBy = "occurred_at",
    orderDir = "desc",
  } = params;

  const selectColumns =
    "id,user_id,account_id,category_id,direction,amount,currency,occurred_at,note,counterparty,tags,attachment_count,created_at,updated_at";

  const selectOptions = opts.withCount ? { count: "exact" as const } : undefined;

  let query = supabase
    .from("transactions")
    .select(selectColumns, selectOptions)
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);

  if (direction && direction !== "all") {
    query = query.eq("direction", direction);
  }
  if (accountIds && accountIds.length > 0) {
    query = query.in("account_id", accountIds);
  }
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (search && search.trim() !== "") {
    const pattern = `%${search.trim()}%`;
    query = query.or(`counterparty.ilike.${pattern},note.ilike.${pattern}`);
  }
  if (typeof minAmountMajor === "number" && Number.isFinite(minAmountMajor) && minAmountMajor > 0) {
    query = query.gte("amount", Math.round(minAmountMajor * 100));
  }
  if (typeof maxAmountMajor === "number" && Number.isFinite(maxAmountMajor) && maxAmountMajor > 0) {
    query = query.lte("amount", Math.round(maxAmountMajor * 100));
  }
  if (from) {
    query = query.gte("occurred_at", from);
  }
  if (to) {
    query = query.lte("occurred_at", to);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const records = (data ?? []) as TransactionRecord[];

  if (records.length === 0) {
    return { data: records, count };
  }

  const ids = records.map((item) => item.id);
  const inList = ids.join(",");
  const transferMap = new Map<string, { id: string; role: "expense" | "income" }>();

  if (inList.length > 0) {
    const { data: transfers, error: transfersError } = await supabase
      .from("transaction_transfers")
      .select("id,expense_txn_id,income_txn_id")
      .or(`expense_txn_id.in.(${inList}),income_txn_id.in.(${inList})`);

    if (transfersError) throw transfersError;

    for (const tr of transfers ?? []) {
      if (tr.expense_txn_id) {
        transferMap.set(tr.expense_txn_id, { id: tr.id, role: "expense" });
      }
      if (tr.income_txn_id) {
        transferMap.set(tr.income_txn_id, { id: tr.id, role: "income" });
      }
    }
  }

  const enriched = records.map((rec) => {
    const meta = transferMap.get(rec.id) || null;
    return {
      ...rec,
      transfer_id: meta?.id ?? null,
      transfer_role: meta?.role ?? null,
    } satisfies TransactionRecord;
  });

  return { data: enriched, count };
}

export async function listTransfers(params: TransferListParams = {}): Promise<TransferRecord[]> {
  const supabase = await createRSCClient();
  const {
    limit = 100,
    from,
    to,
    accountIds,
    minAmountMajor,
    maxAmountMajor,
    search,
    orderDir = "desc",
  } = params;

  let query = supabase
    .from("transaction_transfers")
    .select(
      "id,user_id,from_account_id,to_account_id,amount,currency,occurred_at,note,expense_txn_id,income_txn_id,created_at"
    )
    .order("occurred_at", { ascending: orderDir === "asc" })
    .limit(limit);

  if (from) {
    query = query.gte("occurred_at", from);
  }
  if (to) {
    query = query.lte("occurred_at", to);
  }
  if (accountIds && accountIds.length > 0) {
    const formatted = accountIds.map((id) => `"${id}"`).join(",");
    query = query.or(`from_account_id.in.(${formatted}),to_account_id.in.(${formatted})`);
  }
  if (typeof minAmountMajor === "number" && Number.isFinite(minAmountMajor) && minAmountMajor > 0) {
    query = query.gte("amount", Math.round(minAmountMajor * 100));
  }
  if (typeof maxAmountMajor === "number" && Number.isFinite(maxAmountMajor) && maxAmountMajor > 0) {
    query = query.lte("amount", Math.round(maxAmountMajor * 100));
  }
  if (search && search.trim() !== "") {
    const pattern = `%${search.trim()}%`;
    query = query.ilike("note", pattern);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TransferRecord[];
}

export type InsertTransactionInput = z.infer<typeof transactionSchema>;

export async function createTransaction(input: InsertTransactionInput): Promise<TransactionRecord> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const parsed = transactionSchema.parse(input);
  const payload = {
    user_id: user.id,
    account_id: parsed.account_id,
    category_id: parsed.category_id ?? null,
    direction: parsed.direction,
    amount: Math.round(parsed.amount_major * 100),
    currency: parsed.currency,
    occurred_at: parsed.occurred_at ?? new Date().toISOString(),
    note: parsed.note ?? null,
    counterparty: parsed.counterparty ?? null,
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select(
      "id,user_id,account_id,category_id,direction,amount,currency,occurred_at,note,counterparty,tags,attachment_count,created_at,updated_at"
    )
    .single();
  if (error) throw error;
  return data as TransactionRecord;
}

export type UpdateTransactionInput = z.infer<typeof updateSchema>;

export async function updateTransaction(input: UpdateTransactionInput): Promise<TransactionRecord> {
  const supabase = await createRouteClient();
  const parsed = updateSchema.parse(input);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const patch: Record<string, unknown> = {};
  if (parsed.payload.account_id) patch.account_id = parsed.payload.account_id;
  if (parsed.payload.category_id !== undefined) patch.category_id = parsed.payload.category_id;
  if (parsed.payload.direction) patch.direction = parsed.payload.direction;
  if (parsed.payload.amount_major !== undefined) patch.amount = Math.round(parsed.payload.amount_major * 100);
  if (parsed.payload.currency) patch.currency = parsed.payload.currency;
  if (parsed.payload.occurred_at) patch.occurred_at = parsed.payload.occurred_at;
  if (parsed.payload.note !== undefined) patch.note = parsed.payload.note;
  if (parsed.payload.counterparty !== undefined) patch.counterparty = parsed.payload.counterparty;

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", parsed.id)
    .eq("user_id", user.id)
    .select(
      "id,user_id,account_id,category_id,direction,amount,currency,occurred_at,note,counterparty,tags,attachment_count,created_at,updated_at"
    )
    .single();

  if (error) throw error;
  return data as TransactionRecord;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const { data: transfer, error: transferError } = await supabase
    .from("transaction_transfers")
    .select("id,expense_txn_id,income_txn_id")
    .eq("user_id", user.id)
    .or(`expense_txn_id.eq.${id},income_txn_id.eq.${id}`)
    .maybeSingle();
  if (transferError) throw transferError;

  if (transfer) {
    const relatedIds = [transfer.expense_txn_id, transfer.income_txn_id].filter(Boolean) as string[];
    const { error: deleteTxError } = await supabase
      .from("transactions")
      .delete()
      .in("id", relatedIds)
      .eq("user_id", user.id);
    if (deleteTxError) throw deleteTxError;

    const { error: deleteTransferError } = await supabase
      .from("transaction_transfers")
      .delete()
      .eq("id", transfer.id)
      .eq("user_id", user.id);
    if (deleteTransferError) throw deleteTransferError;
    return;
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export type TransferInput = TransferInputSchemaType;

export async function createTransfer(input: TransferInput): Promise<string> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const parsed = transferSchema.parse(input);

  if (parsed.from_account_id === parsed.to_account_id) {
    throw new Error("Счета источника и назначения должны отличаться");
  }

  const amountMinor = Math.round(parsed.amount_major * 100);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("Сумма перевода должна быть больше 0");
  }

  const { data, error } = await supabase.rpc("fn_create_transfer", {
    p_from_account: parsed.from_account_id,
    p_to_account: parsed.to_account_id,
    p_amount: amountMinor,
    p_currency: parsed.currency,
    p_occurred_at: parsed.occurred_at ?? null,
    p_note: parsed.note ?? null,
  });

  if (error) throw error;
  if (!data || typeof data !== "string") {
    throw new Error("Не удалось создать перевод");
  }

  return data;
}
