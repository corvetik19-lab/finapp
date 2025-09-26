"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/server";

const DEFAULT_STASH_TARGET_MINOR = 5000000; // 50 000 ₽

function boolFromForm(value: FormDataEntryValue | null): boolean {
  if (!value || typeof value !== "string") return false;
  return ["on", "true", "1", "да"].includes(value.toLowerCase());
}

export async function addFundsAction(formData: FormData): Promise<void> {
  const noteEntry = formData.get("note");
  const noteValue = typeof noteEntry === "string" ? noteEntry.trim() : undefined;
  const parsed = addFundsSchema.safeParse({
    account_id: formData.get("account_id"),
    currency: formData.get("currency"),
    note: noteValue ? noteValue : undefined,
  });
  if (!parsed.success) {
    throw new Error("Некорректные данные пополнения");
  }

  const amountMinor = parseMoneyField(formData.get("amount_major"), {
    requirePositive: true,
  });
  if (amountMinor == null) {
    throw new Error("Сумма должна быть больше 0");
  }

  const supabase = await getSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Не удалось получить пользователя");
  }

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: parsed.data.account_id,
    amount: amountMinor,
    currency: parsed.data.currency,
    direction: "income",
    occurred_at: new Date().toISOString(),
    note: parsed.data.note ?? "Пополнение карты",
    attachment_count: 0,
    tags: [],
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/cards");
}

function parseMoneyField(
  value: FormDataEntryValue | null,
  { allowNull = false, requirePositive = false }: { allowNull?: boolean; requirePositive?: boolean } = {}
): number | null {
  if (value == null || typeof value !== "string") {
    return allowNull ? null : 0;
  }
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) {
    return allowNull ? null : 0;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Некорректная сумма");
  }
  const minor = Math.round(parsed * 100);
  if (requirePositive && minor <= 0) {
    throw new Error("Сумма должна быть больше 0");
  }
  return minor;
}

// Zod schemas
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const uuidSchema = z.string().uuid();
const addCardSchema = z.object({
  name: z.string().min(1),
  currency: currencySchema,
  card_type: z.enum(["debit", "credit"]),
});

const addFundsSchema = z.object({
  account_id: uuidSchema,
  currency: currencySchema,
  note: z.string().trim().max(200).optional(),
});

const upsertStashSchema = z.object({
  account_id: uuidSchema,
  currency: currencySchema,
});

const transferSchema = z.object({
  account_id: uuidSchema,
  stash_id: uuidSchema,
  direction: z.enum(["to_stash", "from_stash"]),
  currency: currencySchema,
});

async function getSupabase() {
  return createRouteClient();
}

export async function addCardAction(formData: FormData): Promise<void> {
  const parsed = addCardSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
    card_type: formData.get("card_type"),
  });
  if (!parsed.success) {
    throw new Error("Некорректные данные карты");
  }
  if (parsed.data.card_type !== "debit") {
    throw new Error("Пока поддерживаются только дебетовые карты");
  }

  const initialBalanceMinor = parseMoneyField(formData.get("initial_balance"), { allowNull: true }) ?? 0;
  const createStash = boolFromForm(formData.get("create_stash"));

  const supabase = await getSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Не удалось получить пользователя");
  }

  const {
    data: account,
    error: insertError,
  } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: "card",
      currency: parsed.data.currency,
    })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(insertError.message);
  }

  if (initialBalanceMinor > 0) {
    const { error: initialTxError } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: account.id,
      amount: initialBalanceMinor,
      currency: parsed.data.currency,
      direction: "income",
      occurred_at: new Date().toISOString(),
      note: "Начальный баланс карты",
      attachment_count: 0,
      tags: [],
    });
    if (initialTxError) {
      throw new Error(initialTxError.message);
    }
  }

  if (createStash) {
    const { error: stashError } = await supabase.from("account_stashes").insert({
      user_id: user.id,
      account_id: account.id,
      target_amount: DEFAULT_STASH_TARGET_MINOR,
      balance: 0,
      currency: parsed.data.currency,
      name: "Кубышка",
    });
    if (stashError) {
      throw new Error(stashError.message);
    }
  }

  revalidatePath("/cards");
}

export async function upsertStashAction(formData: FormData): Promise<void> {
  const parsed = upsertStashSchema.safeParse({
    account_id: formData.get("account_id"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    throw new Error("Некорректные данные Кубышки");
  }

  const targetAmountMinor = parseMoneyField(formData.get("target_amount_major"), {
    allowNull: true,
  });

  const supabase = await getSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Не удалось получить пользователя");
  }

  const { data: existing, error: selErr } = await supabase
    .from("account_stashes")
    .select("id")
    .eq("user_id", user.id)
    .eq("account_id", parsed.data.account_id)
    .maybeSingle();
  if (selErr && selErr.code !== "PGRST116") {
    throw new Error(selErr.message);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("account_stashes")
      .update({
        target_amount: targetAmountMinor ?? null,
        currency: parsed.data.currency,
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("account_stashes")
      .insert({
        user_id: user.id,
        account_id: parsed.data.account_id,
        target_amount: targetAmountMinor ?? null,
        currency: parsed.data.currency,
        name: "Кубышка",
      });
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/cards");
}

export async function transferStashAction(formData: FormData): Promise<void> {
  const parsed = transferSchema.safeParse({
    account_id: formData.get("account_id"),
    stash_id: formData.get("stash_id"),
    direction: formData.get("direction"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    throw new Error("Некорректные параметры перевода");
  }

  const amountMinor = parseMoneyField(formData.get("amount_major"), {
    requirePositive: true,
  });
  if (amountMinor == null) {
    throw new Error("Сумма должна быть больше 0");
  }

  const supabase = await getSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Не удалось получить пользователя");
  }

  const isToStash = parsed.data.direction === "to_stash";

  const { data: txIns, error: txErr } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: parsed.data.account_id,
      amount: amountMinor,
      currency: parsed.data.currency,
      direction: isToStash ? "expense" : "income",
      occurred_at: new Date().toISOString(),
      note: isToStash ? "Перевод в Кубышку" : "Перевод из Кубышки",
      attachment_count: 0,
      tags: [],
    })
    .select("id")
    .single();
  if (txErr) {
    throw new Error(txErr.message);
  }

  const { data: stashRow, error: stashSelErr } = await supabase
    .from("account_stashes")
    .select("balance")
    .eq("id", parsed.data.stash_id)
    .maybeSingle();
  if (stashSelErr) {
    throw new Error(stashSelErr.message);
  }

  const newBalance = (stashRow?.balance ?? 0) + (isToStash ? amountMinor : -amountMinor);
  if (newBalance < 0) {
    throw new Error("Недостаточно средств в Кубышке");
  }

  const { error: updErr } = await supabase
    .from("account_stashes")
    .update({ balance: newBalance })
    .eq("id", parsed.data.stash_id);
  if (updErr) {
    throw new Error(updErr.message);
  }

  const { error: histErr } = await supabase
    .from("account_stash_transfers")
    .insert({
      user_id: user.id,
      stash_id: parsed.data.stash_id,
      transaction_id: txIns.id,
      direction: parsed.data.direction,
      amount: amountMinor,
      occurred_at: new Date().toISOString(),
    });
  if (histErr) {
    throw new Error(histErr.message);
  }

  revalidatePath("/cards");
}
