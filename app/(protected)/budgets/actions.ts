"use server";

import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";
import { budgetFormSchema } from "@/lib/validation/budget";
import { checkBudgetAchievements } from "@/lib/gamification/detectors";

function toObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createBudget(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const raw = toObject(formData);
  const parsed = budgetFormSchema.parse({
    category_id: raw.category_id,
    period_start: raw.period_start,
    period_end: raw.period_end,
    limit_amount: raw.limit_amount,
    currency: (raw.currency as string) || "RUB",
  });

  const limitMinor = Math.round(parsed.limit_amount * 100);

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.category_id,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    limit_amount: limitMinor,
    currency: parsed.currency,
  });
  if (error) throw error;

  // Проверяем достижения по бюджетам
  checkBudgetAchievements(user.id).catch(console.error);

  revalidatePath("/budgets");
}

export async function updateBudget(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Нет идентификатора бюджета");

  const raw = toObject(formData);
  const parsed = budgetFormSchema.parse({
    category_id: raw.category_id,
    period_start: raw.period_start,
    period_end: raw.period_end,
    limit_amount: raw.limit_amount,
    currency: (raw.currency as string) || "RUB",
  });

  const limitMinor = Math.round(parsed.limit_amount * 100);

  const { error } = await supabase
    .from("budgets")
    .update({
      category_id: parsed.category_id,
      period_start: parsed.period_start,
      period_end: parsed.period_end,
      limit_amount: limitMinor,
      currency: parsed.currency,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/budgets");
}

export async function deleteBudget(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Нет идентификатора бюджета");

  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/budgets");
}
