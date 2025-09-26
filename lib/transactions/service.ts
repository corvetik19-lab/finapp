import { z } from "zod";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { transactionSchema } from "@/lib/validation/transaction";

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
};

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
  orderBy?: "occurred_at" | "created_at";
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
  return { data: (data ?? []) as TransactionRecord[], count };
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

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amountMajor: number;
  currency: string;
  occurred_at?: string;
  note?: string | null;
};

export async function createTransfer(input: TransferInput): Promise<void> {
  void input;
  // TODO: реализовать двойную проводку (списание + зачисление) при появлении UI и требований
  throw new Error("Transfers are not implemented yet");
}
