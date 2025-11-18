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

  // Проверяем есть ли кубышка у этой карты
  const { data: stash } = await supabase
    .from("account_stashes")
    .select("id, balance, target_amount")
    .eq("account_id", parsed.data.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  let amountToCard = amountMinor;
  let amountToStash = 0;

  // Если есть кубышка с лимитом
  if (stash && stash.target_amount && stash.target_amount > 0) {
    const currentStashBalance = stash.balance ?? 0;
    const stashLimit = stash.target_amount;

    // Кубышка = виртуальный лимит банка
    // balance = сколько доступно
    // Использовано = limit - balance
    
    // Если кубышка использовалась (balance < limit) - сначала возвращаем долг
    if (currentStashBalance < stashLimit) {
      const stashDebt = stashLimit - currentStashBalance; // Сколько должны вернуть
      
      // Возвращаем долг (сколько можем)
      amountToStash = Math.min(amountMinor, stashDebt);
      // Остаток на карту
      amountToCard = amountMinor - amountToStash;

      // Увеличиваем доступный баланс кубышки (возвращаем долг)
      const newStashBalance = currentStashBalance + amountToStash;
      const { error: stashUpdateErr } = await supabase
        .from("account_stashes")
        .update({ balance: newStashBalance })
        .eq("id", stash.id);
      
      if (stashUpdateErr) {
        console.error("Failed to update stash balance:", stashUpdateErr);
      }
    }
  }

  // Создаём транзакцию только на сумму которая идёт на карту
  if (amountToCard > 0) {
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: parsed.data.account_id,
      amount: amountToCard,
      currency: parsed.data.currency,
      direction: "income",
      occurred_at: new Date().toISOString(),
      note: parsed.data.note ?? (amountToStash > 0 ? "Пополнение карты (после кубышки)" : "Пополнение карты"),
      attachment_count: 0,
      tags: [],
    });
    if (insertError) {
      throw new Error(insertError.message);
    }

    // Обновляем баланс счёта
    const { error: updateBalanceError } = await supabase.rpc("increment_account_balance", {
      p_account_id: parsed.data.account_id,
      p_amount: amountToCard,
    });
    if (updateBalanceError) {
      console.error("Failed to update account balance:", updateBalanceError);
    }
  }

  // Если вся сумма пошла в кубышку, создаём транзакцию для истории
  if (amountToStash > 0 && amountToCard === 0) {
    const { data: txIns, error: txErr } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: parsed.data.account_id,
        amount: amountToStash,
        currency: parsed.data.currency,
        direction: "expense", // Расход с карты в кубышку
        occurred_at: new Date().toISOString(),
        note: "Автоматическое пополнение кубышки",
        attachment_count: 0,
        tags: [],
      })
      .select("id")
      .single();

    if (!txErr && txIns) {
      // Записываем в историю переводов кубышки
      await supabase
        .from("account_stash_transfers")
        .insert({
          user_id: user.id,
          stash_id: stash!.id,
          transaction_id: txIns.id,
          direction: "to_stash",
          amount: amountToStash,
          occurred_at: new Date().toISOString(),
        });
    }
  }

  revalidatePath("/finance/cards");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/dashboard");
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

const updateCardSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  balance: z.string().transform((val) => Math.round(parseFloat(val) * 100)),
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
      balance: initialBalanceMinor, // Сохраняем начальный баланс прямо в счёт
    })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(insertError.message);
  }

  // Не создаём транзакцию для начального баланса - он уже сохранён в поле balance

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

  revalidatePath("/finance/cards");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/dashboard");
}

export async function updateCardAction(formData: FormData): Promise<void> {
  const parsed = updateCardSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    balance: formData.get("balance"),
  });
  if (!parsed.success) {
    throw new Error("Некорректные данные карты");
  }

  const supabase = await getSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Не удалось получить пользователя");
  }

  // Проверяем что карта принадлежит пользователю и это дебетовая карта
  const { data: card, error: cardErr } = await supabase
    .from("accounts")
    .select("id, type, credit_limit")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .eq("type", "card")
    .single();

  if (cardErr || !card) {
    throw new Error("Карта не найдена");
  }

  // Проверяем что это дебетовая карта (без credit_limit)
  if (card.credit_limit != null) {
    throw new Error("Редактирование кредитных карт не поддерживается");
  }

  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      name: parsed.data.name,
      balance: parsed.data.balance,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/finance/cards");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/budgets");
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

  revalidatePath("/finance/cards");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/dashboard");
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

  revalidatePath("/finance/cards");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/dashboard");
}
