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
  
  // Обрабатываем category_id - может быть category, net_category или acc_account
  let categoryId: string | null = null;
  let accountId: string | null = null;
  
  const selectedValue = String(raw.category_id || "");
  if (selectedValue.startsWith("net_")) {
    // Формат: net_{categoryId} - бюджет чистой прибыли
    categoryId = selectedValue.replace("net_", "");
  } else if (selectedValue.startsWith("acc_")) {
    // Формат: acc_{accountId} - бюджет для кредитной карты
    accountId = selectedValue.replace("acc_", "");
  } else {
    // Обычная категория
    categoryId = selectedValue;
  }
  
  const parsed = budgetFormSchema.parse({
    category_id: categoryId || undefined,
    period_start: raw.period_start,
    period_end: raw.period_end,
    limit_amount: raw.limit_amount,
    currency: (raw.currency as string) || "RUB",
  });

  const limitMinor = Math.round(parsed.limit_amount * 100);

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: categoryId,
    account_id: accountId,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    limit_amount: limitMinor,
    currency: parsed.currency,
    notes: raw.notes ? String(raw.notes) : null,
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
  if (authError || !user) {
    console.error("Delete budget: auth error", authError);
    throw authError ?? new Error("Нет пользователя");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    console.error("Delete budget: no ID provided");
    throw new Error("Нет идентификатора бюджета");
  }

  console.log("Deleting budget:", { id, user_id: user.id });

  // Сначала проверяем что бюджет существует
  const { data: existing, error: checkError } = await supabase
    .from("budgets")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (checkError) {
    console.error("Delete budget: check error", checkError);
    throw new Error(`Бюджет не найден: ${checkError.message}`);
  }

  if (!existing) {
    console.error("Delete budget: not found");
    throw new Error("Бюджет не найден");
  }

  if (existing.user_id !== user.id) {
    console.error("Delete budget: wrong user", { existing_user: existing.user_id, current_user: user.id });
    throw new Error("Нет доступа к этому бюджету");
  }

  // Удаляем
  const { error, count } = await supabase
    .from("budgets")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete budget: delete error", error);
    throw new Error(`Ошибка удаления: ${error.message}`);
  }

  console.log("Budget deleted successfully:", { id, deleted_count: count });

  revalidatePath("/budgets");
}
