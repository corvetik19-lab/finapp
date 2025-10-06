"use server";

import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";
import { debtFormSchema } from "@/lib/validation/debt";

function toObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createDebt(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const raw = toObject(formData);
  const parsed = debtFormSchema.parse({
    type: raw.type,
    creditor_debtor_name: raw.creditor_debtor_name,
    amount: Number(raw.amount),
    currency: (raw.currency as string) || "RUB",
    date_created: raw.date_created,
    date_due: raw.date_due ? String(raw.date_due) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  });

  const amountMinor = Math.round(parsed.amount * 100);

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    type: parsed.type,
    creditor_debtor_name: parsed.creditor_debtor_name,
    amount: amountMinor,
    currency: parsed.currency,
    date_created: parsed.date_created,
    date_due: parsed.date_due || null,
    status: "active",
    amount_paid: 0,
    description: parsed.description || null,
  });

  if (error) throw error;

  revalidatePath("/debts");
}

export async function updateDebt(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Нет идентификатора долга");

  const raw = toObject(formData);
  const parsed = debtFormSchema.parse({
    type: raw.type,
    creditor_debtor_name: raw.creditor_debtor_name,
    amount: Number(raw.amount),
    currency: (raw.currency as string) || "RUB",
    date_created: raw.date_created,
    date_due: raw.date_due ? String(raw.date_due) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  });

  const amountMinor = Math.round(parsed.amount * 100);

  const { error } = await supabase
    .from("debts")
    .update({
      type: parsed.type,
      creditor_debtor_name: parsed.creditor_debtor_name,
      amount: amountMinor,
      currency: parsed.currency,
      date_created: parsed.date_created,
      date_due: parsed.date_due || null,
      description: parsed.description || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/debts");
}

export async function deleteDebt(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Нет идентификатора долга");

  const { error } = await supabase
    .from("debts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/debts");
}

export async function markDebtAsPaid(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Нет идентификатора долга");

  // Получаем текущий долг
  const { data: debt } = await supabase
    .from("debts")
    .select("amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!debt) throw new Error("Долг не найден");

  const { error } = await supabase
    .from("debts")
    .update({
      status: "paid",
      amount_paid: debt.amount,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/debts");
}

export async function recordPartialPayment(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  const paymentAmount = Number(formData.get("payment_amount") ?? 0);

  if (!id) throw new Error("Нет идентификатора долга");
  if (paymentAmount <= 0) throw new Error("Сумма платежа должна быть больше 0");

  const paymentMinor = Math.round(paymentAmount * 100);

  // Получаем текущий долг
  const { data: debt } = await supabase
    .from("debts")
    .select("amount, amount_paid")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!debt) throw new Error("Долг не найден");

  const newAmountPaid = debt.amount_paid + paymentMinor;
  const isPaid = newAmountPaid >= debt.amount;

  const { error } = await supabase
    .from("debts")
    .update({
      amount_paid: newAmountPaid,
      status: isPaid ? "paid" : "partially_paid",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/debts");
}
