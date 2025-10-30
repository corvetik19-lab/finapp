"use server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";
import {
  transactionSchema,
  transactionFormSchema,
  transactionEditFormSchema,
  transferFormSchema,
  type TransactionFormValues,
  type TransactionEditFormValues,
  type TransferFormValues,
} from "@/lib/validation/transaction";
import {
  createTransaction as createTransactionService,
  updateTransaction as updateTransactionService,
  deleteTransaction as deleteTransactionService,
  createTransfer as createTransferService,
  listTransactionsForSelectRoute,
} from "@/lib/transactions/service";
import type { TransactionSelectItem } from "@/lib/transactions/service";
import type { CsvNormalizedRow } from "@/lib/csv/import-schema";
import { buildExportCsv } from "@/lib/csv/export";
import { z } from "zod";
import { NextResponse } from "next/server";
import { checkTransactionAchievements } from "@/lib/gamification/detectors";

export async function createDefaultAccount() {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Нет пользователя");

  // Проверим наличие хотя бы одного счёта
  const { data: existing, error: exErr } = await supabase
    .from("accounts")
    .select("id")
    .limit(1);
  if (exErr) throw exErr;
  if (existing && existing.length > 0) return revalidatePath("/transactions");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: "Наличные",
    type: "cash",
    currency: "RUB",
  });
  if (error) throw error;
  revalidatePath("/transactions");
}

const transactionSelectParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    ids: z.array(z.string().uuid()).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .partial();

export async function fetchTransactionsForSelectAction(
  raw: unknown = {}
): Promise<TransactionSelectItem[]> {
  const parsed = transactionSelectParamsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Некорректные параметры выбора транзакций");
  }

  const payload = parsed.data;

  return listTransactionsForSelectRoute({
    ...payload,
    search: payload.search?.trim() || undefined,
  });
}

const exportParamsSchema = z.object({
  searchParams: z.record(z.string(), z.string().optional()).optional(),
});

export async function exportTransactionsAction(rawParams: unknown): Promise<Response> {
  const params = exportParamsSchema.parse(rawParams);

  const url = new URL("/transactions/export", "http://localhost");
  const sp = params.searchParams ?? {};
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw userError ?? new Error("Нет пользователя");

  const { data: accountsData, error: accountError } = await supabase
    .from("accounts")
    .select("id,name")
    .order("created_at", { ascending: true });
  if (accountError) throw accountError;
  const accountLookup = new Map<string, string>();
  for (const account of accountsData ?? []) {
    if (!account.id || !account.name) continue;
    accountLookup.set(account.id, account.name);
  }

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id,name");
  if (categoriesError) throw categoriesError;
  const categoryLookup = new Map<string, string>();
  for (const category of categoriesData ?? []) {
    if (!category.id || !category.name) continue;
    categoryLookup.set(category.id, category.name);
  }

  const query = supabase
    .from("transactions")
    .select("id,occurred_at,direction,amount,currency,account_id,category_id,counterparty,note")
    .order("occurred_at", { ascending: false });

  const filter = (key: string) => url.searchParams.get(key);
  const direction = filter("type");
  if (direction === "income" || direction === "expense") {
    query.eq("direction", direction);
  }

  const accountsFilter = filter("accounts");
  if (accountsFilter) {
    const accountIds = accountsFilter.split(",").filter(Boolean);
    if (accountIds.length > 0) query.in("account_id", accountIds);
  }

  const categoriesFilter = filter("categories");
  if (categoriesFilter) {
    const categoryIds = categoriesFilter.split(",").filter(Boolean);
    if (categoryIds.length > 0) query.in("category_id", categoryIds);
  }

  const search = filter("q");
  if (search) {
    const pattern = `%${search.trim()}%`;
    query.or(`counterparty.ilike.${pattern},note.ilike.${pattern}`);
  }

  const from = filter("from");
  if (from) {
    query.gte("occurred_at", from);
  }
  const to = filter("to");
  if (to) {
    query.lte("occurred_at", to);
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  const csv = buildExportCsv(rows ?? [], {
    accounts: accountLookup,
    categories: categoryLookup,
  });

  const response = new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
  return response;
}

const updateTxnSchema = z.object({
  id: z.string().uuid(),
  note: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  // extra editable fields
  amount_major: z
    .preprocess((v) => (typeof v === "string" ? v.replace(/,/g, ".") : v), z.coerce.number().positive("Сумма должна быть больше 0")).optional(),
  direction: z.enum(["income", "expense"]).optional(),
  account_id: z.string().uuid().optional(),
  occurred_at: z.string().optional(),
});

export type UpdateTxnState = { ok: boolean; error?: string };

export async function updateTransactionAction(
  _prev: UpdateTxnState,
  formData: FormData
): Promise<UpdateTxnState> {
  try {
    const parsed = updateTxnSchema.safeParse({
      id: String(formData.get("id") || ""),
      note: (formData.get("note") as string) || undefined,
      category_id: (formData.get("category_id") as string) || undefined,
      amount_major: (formData.get("amount_major") as string) || undefined,
      direction: ((formData.get("direction") as string) || undefined),
      account_id: (formData.get("account_id") as string) || undefined,
      occurred_at: (formData.get("occurred_at") as string) || undefined,
    });
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

    const v = parsed.data;
    await updateTransactionService({
      id: v.id,
      payload: {
        note: v.note ?? null,
        category_id: v.category_id ?? undefined,
        amount_major: v.amount_major,
        direction: v.direction,
        account_id: v.account_id,
        occurred_at: v.occurred_at,
      },
    });
    revalidatePath("/transactions");
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка обновления";
    return { ok: false, error: msg };
  }
}

export type DeleteTxnState = { ok: boolean; error?: string };

export async function deleteTransactionAction(
  _prev: DeleteTxnState,
  formData: FormData
): Promise<DeleteTxnState> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) throw new Error("Нет id транзакции");
    await deleteTransactionService(id);
    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/loans"); // Обновляем страницу кредитов при удалении транзакции
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка удаления";
    return { ok: false, error: msg };
  }
}

export type TxnActionState = { ok: boolean; error?: string };

export async function createTransactionAction(
  _prev: TxnActionState,
  formData: FormData
): Promise<TxnActionState> {
  try {
    await createTransaction(formData);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Не удалось сохранить транзакцию";
    return { ok: false, error: msg };
  }
}

export async function createTransaction(formData: FormData) {
  const raw = {
    direction: String(formData.get("direction") || "expense"),
    account_id: String(formData.get("account_id") || ""),
    category_id: (formData.get("category_id") as string) || undefined,
    amount_major: String(formData.get("amount_major") || ""),
    currency: String(formData.get("currency") || "RUB"),
    occurred_at: (formData.get("occurred_at") as string) || undefined,
    note: (formData.get("note") as string) || undefined,
    counterparty: (formData.get("counterparty") as string) || undefined,
  } as Record<string, unknown>;

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(msg);
  }

  await createTransactionService(parsed.data);

  // Проверяем достижения
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    checkTransactionAchievements(user.id).catch(console.error);
  }

  revalidatePath("/transactions");
  revalidatePath("/cards");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function createTransactionFromValues(values: TransactionFormValues): Promise<TxnActionState> {
  try {
    const parsed = transactionFormSchema.parse(values);
    await createTransactionService({
      ...parsed,
      category_id: parsed.category_id ? parsed.category_id : null,
      amount_major: Number(parsed.amount_major.replace(/\s+/g, "").replace(",", ".")),
    });

    // Проверяем достижения
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      checkTransactionAchievements(user.id).catch(console.error);
    }

    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Не удалось сохранить транзакцию";
    return { ok: false, error: msg };
  }
}

export type TransferActionState = { ok: boolean; error?: string };

export async function createTransferAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const raw = {
      from_account_id: String(formData.get("from_account_id") || ""),
      to_account_id: String(formData.get("to_account_id") || ""),
      amount_major: String(formData.get("amount_major") || ""),
      currency: String(formData.get("currency") || "RUB"),
      occurred_at: (formData.get("occurred_at") as string) || undefined,
      note: (formData.get("note") as string) || undefined,
    } satisfies Record<string, unknown>;
    const parsed = transferFormSchema.parse(raw);
    await createTransferService({
      from_account_id: parsed.from_account_id,
      to_account_id: parsed.to_account_id,
      amount_major: Number(parsed.amount_major.replace(/\s+/g, "").replace(",", ".")),
      currency: parsed.currency,
      occurred_at: parsed.occurred_at,
      note: parsed.note ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Не удалось выполнить перевод";
    return { ok: false, error: msg };
  }
}

export async function createTransferFromValues(values: TransferFormValues): Promise<TransferActionState> {
  try {
    const parsed = transferFormSchema.parse(values);
    await createTransferService({
      from_account_id: parsed.from_account_id,
      to_account_id: parsed.to_account_id,
      amount_major: Number(parsed.amount_major.replace(/\s+/g, "").replace(",", ".")),
      currency: parsed.currency,
      occurred_at: parsed.occurred_at,
      note: parsed.note ?? null,
    });
    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Не удалось выполнить перевод";
    return { ok: false, error: msg };
  }
}

export async function updateTransactionFromValues(values: TransactionEditFormValues): Promise<UpdateTxnState> {
  try {
    const parsed = transactionEditFormSchema.parse(values);
    await updateTransactionService({
      id: parsed.id,
      payload: {
        direction: parsed.direction,
        account_id: parsed.account_id,
        category_id: parsed.category_id ? parsed.category_id : null,
        amount_major: Number(parsed.amount_major.replace(/\s+/g, "").replace(",", ".")),
        currency: parsed.currency,
        occurred_at: parsed.occurred_at,
        note: parsed.note ?? null,
        counterparty: parsed.counterparty ?? null,
      },
    });
    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ошибка обновления";
    return { ok: false, error: msg };
  }
}

type ImportCsvResult = {
  ok: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
};

function normalizeKey(
  occurredAtISO: string,
  direction: string,
  amountMinor: number,
  accountId: string,
  categoryId: string | null
) {
  return `${occurredAtISO}|${direction}|${amountMinor}|${accountId}|${categoryId ?? ""}`;
}

export async function importTransactionsAction(rows: CsvNormalizedRow[]): Promise<ImportCsvResult> {
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      message: "Нет данных для импорта",
      imported: 0,
      skipped: 0,
      errors: [],
    };
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw userError ?? new Error("Нет пользователя");

  const { data: accountsData, error: accountsError } = await supabase
    .from("accounts")
    .select("id,name,currency")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (accountsError) throw accountsError;
  if (!accountsData || accountsData.length === 0) {
    return {
      ok: false,
      message: "Нет доступных счетов. Создайте счёт перед импортом.",
      imported: 0,
      skipped: 0,
      errors: [],
    };
  }

  const accountMap = new Map<string, { id: string; currency: string }>();
  for (const acc of accountsData) {
    if (!acc.name) continue;
    accountMap.set(acc.name.trim().toLowerCase(), { id: acc.id, currency: acc.currency });
  }

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id,name");
  if (categoriesError) throw categoriesError;
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData ?? []) {
    if (!cat.name) continue;
    categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
  }

  const timestamps = rows.map((row) => new Date(row.occurredAt).getTime()).filter((ts) => Number.isFinite(ts));
  const minTime = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
  const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

  const existingKeys = new Set<string>();
  if (minTime !== undefined && maxTime !== undefined) {
    const { data: existingData, error: existingError } = await supabase
      .from("transactions")
      .select("occurred_at,amount,direction,account_id,category_id")
      .gte("occurred_at", new Date(minTime).toISOString())
      .lte("occurred_at", new Date(maxTime).toISOString());
    if (existingError) throw existingError;
    for (const txn of existingData ?? []) {
      if (!txn.account_id || !txn.occurred_at) continue;
      const occurredISO = new Date(txn.occurred_at).toISOString();
      const key = normalizeKey(
        occurredISO,
        String(txn.direction),
        Number(txn.amount),
        String(txn.account_id),
        txn.category_id ? String(txn.category_id) : null
      );
      existingKeys.add(key);
    }
  }

  const pendingKeys = new Set<string>();
  const recordsToInsert: Array<Record<string, unknown>> = [];
  const rowErrors: string[] = [];
  let duplicates = 0;

  for (const row of rows) {
    if (row.direction === "transfer") {
      rowErrors.push(`Строка ${row.rowNumber}: импорт переводов пока не поддерживается`);
      continue;
    }

    const accountNameKey = row.accountName ? row.accountName.trim().toLowerCase() : undefined;
    let accountEntry = accountNameKey ? accountMap.get(accountNameKey) : undefined;

    if (!accountEntry && accountsData.length === 1) {
      const single = accountsData[0];
      accountEntry = { id: single.id, currency: single.currency };
    }

    if (!accountEntry) {
      rowErrors.push(`Строка ${row.rowNumber}: счёт "${row.accountName ?? ""}" не найден`);
      continue;
    }

    if (row.currency !== accountEntry.currency) {
      rowErrors.push(
        `Строка ${row.rowNumber}: валюта ${row.currency} не совпадает с валютой счёта ${accountEntry.currency}`
      );
      continue;
    }

    let categoryId: string | null = null;
    if (row.categoryName) {
      const categoryKey = row.categoryName.trim().toLowerCase();
      const catId = categoryMap.get(categoryKey);
      if (!catId) {
        rowErrors.push(`Строка ${row.rowNumber}: категория "${row.categoryName}" не найдена`);
        continue;
      }
      categoryId = catId;
    }

    const occurredISO = new Date(row.occurredAt).toISOString();
    const dedupKey = normalizeKey(occurredISO, row.direction, row.amountMinor, accountEntry.id, categoryId);
    if (existingKeys.has(dedupKey) || pendingKeys.has(dedupKey)) {
      duplicates += 1;
      continue;
    }
    pendingKeys.add(dedupKey);

    recordsToInsert.push({
      user_id: user.id,
      account_id: accountEntry.id,
      category_id: categoryId,
      direction: row.direction,
      amount: row.amountMinor,
      currency: row.currency,
      occurred_at: occurredISO,
      note: row.note ?? null,
      counterparty: row.counterparty ?? null,
    });
  }

  if (recordsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("transactions").insert(recordsToInsert);
    if (insertError) throw insertError;
    revalidatePath("/transactions");
    revalidatePath("/cards");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }

  const messageParts: string[] = [];
  if (recordsToInsert.length > 0) {
    messageParts.push(`Импортировано ${recordsToInsert.length} строк.`);
  }
  if (duplicates > 0) {
    messageParts.push(`Дубликатов пропущено: ${duplicates}.`);
  }
  if (rowErrors.length > 0) {
    const preview = rowErrors.slice(0, 3).join(" | ");
    messageParts.push(`Ошибки: ${preview}${rowErrors.length > 3 ? ` (ещё ${rowErrors.length - 3})` : ""}`);
  }
  if (messageParts.length === 0) {
    messageParts.push("Импорт не выполнил ни одной вставки.");
  }

  return {
    ok: recordsToInsert.length > 0 && rowErrors.length === 0,
    message: messageParts.join(" "),
    imported: recordsToInsert.length,
    skipped: duplicates,
    errors: rowErrors,
  };
}
