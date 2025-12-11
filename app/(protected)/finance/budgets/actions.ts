"use server";

import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";
import { budgetFormSchema } from "@/lib/validation/budget";
import { getCurrentCompanyId } from "@/lib/platform/organization";

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

  const companyId = await getCurrentCompanyId();
  const raw = toObject(formData);
  
  // Обрабатываем category_id - может быть category, net_category, acc_account или prod_product
  let categoryId: string | null = null;
  let accountId: string | null = null;
  let productId: string | null = null;
  
  const selectedValue = String(raw.category_id || "");
  if (selectedValue.startsWith("net_")) {
    // Формат: net_{categoryId} - бюджет чистой прибыли
    categoryId = selectedValue.replace("net_", "");
  } else if (selectedValue.startsWith("acc_")) {
    // Формат: acc_{accountId} - бюджет для кредитной карты
    accountId = selectedValue.replace("acc_", "");
  } else if (selectedValue.startsWith("prod_")) {
    // Формат: prod_{productId} - бюджет для товара
    productId = selectedValue.replace("prod_", "");
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
    company_id: companyId,
    category_id: categoryId || null,
    account_id: accountId || null,
    product_id: productId || null,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    limit_amount: limitMinor,
    currency: parsed.currency,
    notes: raw.notes ? String(raw.notes) : null,
  });
  if (error) throw error;

  revalidatePath("/finance/budgets");
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
      notes: raw.notes ? String(raw.notes) : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/finance/budgets");
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

  revalidatePath("/finance/budgets");
}

// Получить текущий месяц
function getCurrentMonthPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  return {
    start: formatLocal(firstDay),
    end: formatLocal(lastDay),
  };
}

// Сбросить все бюджеты на текущий месяц
export async function resetAllBudgets() {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const currentPeriod = getCurrentMonthPeriod();

  const { error, count } = await supabase
    .from("budgets")
    .update({
      period_start: currentPeriod.start,
      period_end: currentPeriod.end,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Reset budgets error:", error);
    throw new Error(`Ошибка сброса: ${error.message}`);
  }

  console.log("All budgets reset to current month:", { count, period: currentPeriod });

  revalidatePath("/finance/budgets");
  revalidatePath("/finance/dashboard");
  
  return { ok: true, count, period: currentPeriod };
}
