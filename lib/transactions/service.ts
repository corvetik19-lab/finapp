import { z } from "zod";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { transactionSchema, transferSchema, type TransferInput as TransferInputSchemaType } from "@/lib/validation/transaction";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import type { CategoryRow } from "@/types/supabase";

type TransactionWithCategoryJoin = {
  id: string;
  category: CategoryRow | CategoryRow[] | null;
};

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
  transfer_from_account_id?: string | null;
  transfer_to_account_id?: string | null;
};

type TransactionSelectRow = Pick<
  TransactionRecord,
  "id" | "amount" | "currency" | "direction" | "occurred_at" | "note" | "counterparty" | "account_id"
>;

export type TransactionSelectItem = {
  id: string;
  label: string;
  direction: TransactionDirection;
  occurred_at: string;
  account_id: string;
  amount: number; // сумма в копейках
};

export type ListTransactionsForSelectParams = {
  limit?: number;
  search?: string;
  ids?: string[];
  excludeLinked?: boolean;
  fromDate?: string; // ISO date inclusive
  toDate?: string;   // ISO date inclusive
  categoryId?: string; // Фильтр по категории
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

function normalizeOccurredAt(value: string): string {
  try {
    // Для datetime-local (YYYY-MM-DDTHH:mm) добавляем секунды и timezone offset
    // Чтобы PostgreSQL сохранил ИМЕННО это время без конвертации
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      // Получаем timezone offset в минутах и конвертируем в формат +HH:MM
      const offset = -new Date().getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
      const sign = offset >= 0 ? '+' : '-';
      return `${value}:00${sign}${hours}:${minutes}`;
    }
    
    // Если уже есть секунды но нет timezone, добавляем timezone offset
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) && !value.endsWith('Z') && !value.includes('+') && value.lastIndexOf('-') <= 10) {
      const offset = -new Date().getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
      const sign = offset >= 0 ? '+' : '-';
      return `${value}${sign}${hours}:${minutes}`;
    }
    
    // Если уже в формате ISO с Z или timezone, возвращаем как есть
    if (value.endsWith('Z') || value.includes('+') || (value.includes('-') && value.lastIndexOf('-') > 10)) {
      return value;
    }
    
    // Для других форматов пытаемся распарсить
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    
    return date.toISOString();
  } catch {
    return value;
  }
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
    account_id: row.account_id,
    occurred_at: row.occurred_at,
    amount: row.amount,
  };
}

type SupabaseClientLike =
  | Awaited<ReturnType<typeof createRSCClient>>
  | Awaited<ReturnType<typeof createRouteClient>>;

async function queryTransactionsForSelect(
  client: SupabaseClientLike,
  params: ListTransactionsForSelectParams = {}
): Promise<TransactionSelectItem[]> {
  const { limit = 20, search, ids, excludeLinked = false, fromDate, toDate, categoryId } = params;

  let query = client
    .from("transactions")
    .select("id,amount,currency,direction,occurred_at,counterparty,note,account_id")
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

  // Фильтрация по дате
  if (fromDate) {
    query = query.gte("occurred_at", fromDate);
  }
  if (toDate) {
    query = query.lte("occurred_at", toDate);
  }

  // Фильтрация по категории
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  let data, error;
  
  // Исключаем транзакции уже привязанные к другим платежам
  if (excludeLinked && (!ids || ids.length === 0)) {
    const { data: linkedTxnIds } = await client
      .from("upcoming_payments")
      .select("paid_transaction_id")
      .not("paid_transaction_id", "is", null);
    
    if (linkedTxnIds && linkedTxnIds.length > 0) {
      const excludeIds = linkedTxnIds
        .map(row => row.paid_transaction_id)
        .filter((id): id is string => Boolean(id));
      
      if (excludeIds.length > 0) {
        const result = await query.not("id", "in", `(${excludeIds.join(",")})`);
        data = result.data;
        error = result.error;
      } else {
        const result = await query;
        data = result.data;
        error = result.error;
      }
    } else {
      const result = await query;
      data = result.data;
      error = result.error;
    }
  } else {
    const result = await query;
    data = result.data;
    error = result.error;
  }

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
          z.coerce.number().refine((n) => n !== 0, "Сумма не может быть равна 0")
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
  const companyId = await getCurrentCompanyId();
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
    "id,user_id,account_id,category_id,direction,amount,currency,occurred_at,note,counterparty,tags,attachment_count,created_at,updated_at,transfer_from_account_id,transfer_to_account_id";

  const selectOptions = opts.withCount ? { count: "exact" as const } : undefined;

  let query = supabase
    .from("transactions")
    .select(selectColumns, selectOptions)
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);

  // Фильтруем по company_id
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

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
  const companyId = await getCurrentCompanyId();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const parsed = transactionSchema.parse(input);
  const amountMinor = Math.round(parsed.amount_major * 100);
  const payload = {
    user_id: user.id,
    account_id: parsed.account_id,
    category_id: parsed.category_id ?? null,
    direction: parsed.direction,
    amount: amountMinor,
    currency: parsed.currency,
    occurred_at: parsed.occurred_at ? normalizeOccurredAt(parsed.occurred_at) : new Date().toISOString(),
    note: parsed.note ?? null,
    counterparty: parsed.counterparty ?? null,
    company_id: companyId,
  };

  // Получаем информацию о счёте для определения типа
  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .select("id, type, credit_limit")
    .eq("id", parsed.account_id)
    .single();

  if (accountError) throw accountError;

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select(
      "id,user_id,account_id,category_id,direction,amount,currency,occurred_at,note,counterparty,tags,attachment_count,created_at,updated_at"
    )
    .single();
  if (error) throw error;

  // Обновляем баланс счёта
  // Для кредитных карт (type='card' и есть credit_limit):
  //   - расход УВЕЛИЧИВАЕТ задолженность (balance)
  //   - доход УМЕНЬШАЕТ задолженность (balance)
  // Для обычных счетов:
  //   - расход УМЕНЬШАЕТ баланс
  //   - доход УВЕЛИЧИВАЕТ баланс
  const isCreditCard = accountData.type === "card" && accountData.credit_limit != null;
  let balanceChange = 0;

  if (isCreditCard) {
    // Для кредитных карт
    if (parsed.direction === "expense") {
      balanceChange = amountMinor; // Задолженность увеличивается
    } else if (parsed.direction === "income") {
      balanceChange = -amountMinor; // Задолженность уменьшается
    }
  } else {
    // Для обычных счетов
    if (parsed.direction === "expense") {
      balanceChange = -amountMinor; // Баланс уменьшается
    } else if (parsed.direction === "income") {
      balanceChange = amountMinor; // Баланс увеличивается
    }
  }

  if (balanceChange !== 0) {
    // Получаем текущий баланс
    const { data: currentAccount, error: fetchError } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", parsed.account_id)
      .single();

    if (fetchError) throw fetchError;

    // Обновляем баланс
    const newBalance = (currentAccount.balance || 0) + balanceChange;
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("id", parsed.account_id);

    if (updateError) throw updateError;
  }

  // Создаём embedding для семантического поиска (async, не блокируем ответ)
  if (process.env.OPENROUTER_API_KEY) {
    // Запускаем в фоне, не ждём результата
    (async () => {
      try {
        const { createEmbedding, buildTransactionText } = await import("@/lib/ai/openrouter-embeddings");
        
        // Получаем название категории, если есть
        let categoryName: string | null = null;
        if (parsed.category_id) {
          const { data: category } = await supabase
            .from("categories")
            .select("name")
            .eq("id", parsed.category_id)
            .single();
          categoryName = category?.name || null;
        }

        const text = buildTransactionText({
          description: parsed.note || parsed.counterparty || "Транзакция",
          category: categoryName,
          amount_minor: amountMinor,
          direction: parsed.direction,
        });

        const embedding = await createEmbedding(text);
        
        // Сохраняем embedding в БД
        await supabase
          .from("transactions")
          .update({ embedding })
          .eq("id", data.id);
      } catch (err) {
        logger.error("Error creating embedding", { error: err });
        // Не бросаем ошибку, чтобы не сломать основной flow
      }
    })();
  }

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

  // Получаем старые данные транзакции
  const { data: oldTxn, error: fetchError } = await supabase
    .from("transactions")
    .select("id, account_id, direction, amount")
    .eq("id", parsed.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw fetchError;

  const patch: Record<string, unknown> = {};
  // Для переводов не меняем критичные поля (account_id, direction, amount)
  // так как они управляются через transfer_from/to_account_id
  if (parsed.payload.account_id && oldTxn.direction !== "transfer") patch.account_id = parsed.payload.account_id;
  if (parsed.payload.category_id !== undefined) patch.category_id = parsed.payload.category_id;
  if (parsed.payload.direction && oldTxn.direction !== "transfer") patch.direction = parsed.payload.direction;
  if (parsed.payload.amount_major !== undefined && oldTxn.direction !== "transfer") patch.amount = Math.round(parsed.payload.amount_major * 100);
  if (parsed.payload.currency) patch.currency = parsed.payload.currency;
  if (parsed.payload.occurred_at) {
    patch.occurred_at = normalizeOccurredAt(parsed.payload.occurred_at);
  }
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

  // Обновляем балансы если изменились критичные поля
  const accountChanged = parsed.payload.account_id && parsed.payload.account_id !== oldTxn.account_id;
  const directionChanged = parsed.payload.direction && parsed.payload.direction !== oldTxn.direction;
  const amountChanged = parsed.payload.amount_major !== undefined && Math.round(parsed.payload.amount_major * 100) !== oldTxn.amount;

  if (accountChanged || directionChanged || amountChanged) {
    // Отменяем старое изменение баланса
    await reverseBalanceChange(supabase, oldTxn.account_id, oldTxn.direction, oldTxn.amount);

    // Применяем новое изменение баланса
    const newAccountId = parsed.payload.account_id || oldTxn.account_id;
    const newDirection = parsed.payload.direction || oldTxn.direction;
    const newAmount = parsed.payload.amount_major !== undefined ? Math.round(parsed.payload.amount_major * 100) : oldTxn.amount;

    await applyBalanceChange(supabase, newAccountId, newDirection, newAmount);
  }

  return data as TransactionRecord;
}

async function applyBalanceChange(
  supabase: Awaited<ReturnType<typeof createRouteClient>>,
  accountId: string,
  direction: string,
  amount: number
): Promise<void> {
  // Получаем информацию о счёте
  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .select("type, credit_limit, balance")
    .eq("id", accountId)
    .single();

  if (accountError) throw accountError;

  const isCreditCard = accountData.type === "card" && accountData.credit_limit != null;
  let balanceChange = 0;

  if (isCreditCard) {
    // Для кредитных карт
    if (direction === "expense") {
      balanceChange = amount; // Задолженность увеличивается
    } else if (direction === "income") {
      balanceChange = -amount; // Задолженность уменьшается
    }
  } else {
    // Для обычных счетов
    if (direction === "expense") {
      balanceChange = -amount; // Баланс уменьшается
    } else if (direction === "income") {
      balanceChange = amount; // Баланс увеличивается
    }
  }

  if (balanceChange !== 0) {
    const newBalance = (accountData.balance || 0) + balanceChange;
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("id", accountId);

    if (updateError) throw updateError;
  }
}

async function deletePlanTopupsForTransactions(
  supabase: Awaited<ReturnType<typeof createRouteClient>>,
  userId: string,
  transactionIds: string[],
): Promise<void> {
  if (transactionIds.length === 0) return;

  const { error: topupsError } = await supabase
    .from("plan_topups")
    .delete()
    .in("transaction_id", transactionIds)
    .eq("user_id", userId);

  if (topupsError) throw topupsError;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  // Получаем данные транзакции перед удалением для обновления баланса
  const { data: txnToDelete, error: fetchError } = await supabase
    .from("transactions")
    .select("id, account_id, direction, amount, category_id, occurred_at, counterparty")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw fetchError;

  // Проверяем, является ли это транзакцией погашения кредита
  if (txnToDelete.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", txnToDelete.category_id)
      .single();

    if (category && category.name === "Погашение кредита") {
      logger.debug("Deleting loan repayment transaction", {
        amount: txnToDelete.amount,
        occurred_at: txnToDelete.occurred_at,
        counterparty: txnToDelete.counterparty,
      });

      // Извлекаем дату без времени для сравнения
      const txnDate = txnToDelete.occurred_at ? txnToDelete.occurred_at.split('T')[0] : null;
      
      // Ищем соответствующий платёж по кредиту (по сумме)
      const { data: loanPayments, error: paymentsError } = await supabase
        .from("loan_payments")
        .select("id, loan_id, principal_amount, amount, payment_date")
        .eq("user_id", user.id)
        .eq("amount", txnToDelete.amount);

      logger.debug("Found loan payments", { count: loanPayments?.length });

      if (!paymentsError && loanPayments && loanPayments.length > 0) {
        // Ищем платёж с совпадающей датой (берём самый последний если несколько)
        const matchingPayments = loanPayments.filter(p => {
          const paymentDate = p.payment_date ? p.payment_date.split('T')[0] : null;
          const dateMatches = paymentDate === txnDate;
          
          logger.debug("Checking payment", { id: p.id, paymentDate, txnDate, dateMatches });
          return dateMatches;
        });

        // Берём последний платёж (самый свежий)
        const loanPayment = matchingPayments.length > 0 ? matchingPayments[matchingPayments.length - 1] : null;

        logger.debug("Matched loan payment", { id: loanPayment?.id });

        if (loanPayment) {
          // Уменьшаем principal_paid в кредите
          const { data: loan } = await supabase
            .from("loans")
            .select("principal_paid")
            .eq("id", loanPayment.loan_id)
            .single();

          if (loan) {
            const newPrincipalPaid = Math.max(0, (loan.principal_paid || 0) - loanPayment.principal_amount);
            logger.debug("Updating loan principal_paid", {
              old: loan.principal_paid,
              subtract: loanPayment.principal_amount,
              new: newPrincipalPaid,
            });

            // Удаляем запись о платеже сначала
            await supabase
              .from("loan_payments")
              .delete()
              .eq("id", loanPayment.id);

            // Находим последний оставшийся платёж для этого кредита
            const { data: remainingPayments } = await supabase
              .from("loan_payments")
              .select("payment_date")
              .eq("loan_id", loanPayment.loan_id)
              .order("payment_date", { ascending: false })
              .limit(1);

            // Обновляем кредит: principal_paid и last_payment_date
            const lastPaymentDate = remainingPayments && remainingPayments.length > 0 
              ? remainingPayments[0].payment_date 
              : null;

            await supabase
              .from("loans")
              .update({
                principal_paid: newPrincipalPaid,
                last_payment_date: lastPaymentDate,
              })
              .eq("id", loanPayment.loan_id);
          }
          
          logger.debug("Deleted loan payment", { id: loanPayment.id });

          // Удаляем связанную комиссию, если она есть
          // Ищем транзакцию комиссии с той же датой и counterparty
          const { data: commissionTxns } = await supabase
            .from("transactions")
            .select("id, category:categories(name)")
            .eq("user_id", user.id)
            .eq("counterparty", txnToDelete.counterparty)
            .eq("occurred_at", txnToDelete.occurred_at)
            .neq("id", id); // Исключаем текущую транзакцию

          logger.debug("Found potential commission transactions", { count: commissionTxns?.length });

          if (commissionTxns && commissionTxns.length > 0) {
            const commissionTxn = (commissionTxns as TransactionWithCategoryJoin[]).find((txn) => {
              const cat = Array.isArray(txn.category) ? txn.category[0] : txn.category;
              return cat && cat.name === "Комиссия";
            });

            if (commissionTxn) {
              logger.debug("Deleting related commission transaction", { id: commissionTxn.id });
              await supabase
                .from("transactions")
                .delete()
                .eq("id", commissionTxn.id);
            }
          }
        } else {
          logger.debug("No matching loan payment found by date");
        }
      } else {
        logger.debug("No loan payments found for amount", { amount: txnToDelete.amount });
      }
    }
  }

  const { data: transfer, error: transferError } = await supabase
    .from("transaction_transfers")
    .select("id,expense_txn_id,income_txn_id")
    .eq("user_id", user.id)
    .or(`expense_txn_id.eq.${id},income_txn_id.eq.${id}`)
    .maybeSingle();
  if (transferError) throw transferError;

  if (transfer) {
    const relatedIds = [transfer.expense_txn_id, transfer.income_txn_id].filter(Boolean) as string[];

    // Получаем все связанные транзакции для обновления балансов
    const { data: relatedTxns, error: relatedError } = await supabase
      .from("transactions")
      .select("id, account_id, direction, amount")
      .in("id", relatedIds)
      .eq("user_id", user.id);

    if (relatedError) throw relatedError;

    await deletePlanTopupsForTransactions(supabase, user.id, relatedIds);

    const { error: deleteTxError } = await supabase
      .from("transactions")
      .delete()
      .in("id", relatedIds)
      .eq("user_id", user.id);
    if (deleteTxError) throw deleteTxError;

    // Обновляем балансы для всех задействованных счетов
    if (relatedTxns) {
      for (const txn of relatedTxns) {
        await reverseBalanceChange(supabase, txn.account_id, txn.direction, txn.amount);
      }
    }

    const { error: deleteTransferError } = await supabase
      .from("transaction_transfers")
      .delete()
      .eq("id", transfer.id)
      .eq("user_id", user.id);
    if (deleteTransferError) throw deleteTransferError;
    return;
  }

  await deletePlanTopupsForTransactions(supabase, user.id, [id]);

  // Удаляем связанные позиции товаров
  const { error: itemsError } = await supabase
    .from("transaction_items")
    .delete()
    .eq("transaction_id", id)
    .eq("user_id", user.id);
  if (itemsError) logger.error("Error deleting transaction items:", itemsError);

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;

  // Обновляем баланс счёта (в обратную сторону)
  await reverseBalanceChange(supabase, txnToDelete.account_id, txnToDelete.direction, txnToDelete.amount);
}

async function reverseBalanceChange(
  supabase: Awaited<ReturnType<typeof createRouteClient>>,
  accountId: string,
  direction: string,
  amount: number
): Promise<void> {
  // Получаем информацию о счёте
  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .select("type, credit_limit, balance")
    .eq("id", accountId)
    .single();

  if (accountError) throw accountError;

  const isCreditCard = accountData.type === "card" && accountData.credit_limit != null;
  let balanceChange = 0;

  if (isCreditCard) {
    // Для кредитных карт (обратное действие)
    if (direction === "expense") {
      balanceChange = -amount; // Убираем задолженность
    } else if (direction === "income") {
      balanceChange = amount; // Возвращаем задолженность
    }
  } else {
    // Для обычных счетов (обратное действие)
    if (direction === "expense") {
      balanceChange = amount; // Возвращаем деньги
    } else if (direction === "income") {
      balanceChange = -amount; // Убираем деньги
    }
  }

  if (balanceChange !== 0) {
    const newBalance = (accountData.balance || 0) + balanceChange;
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("id", accountId);

    if (updateError) throw updateError;
  }
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
