"use server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

type CategoryKind = "income" | "expense" | "transfer" | "both";

function normalizeParent(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireUser() {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw (error ?? new Error("Нет пользователя"));
  return { supabase, userId: user.id } as const;
}

type PlanPriority = "Высокий" | "Средний" | "Низкий";

function parseMoneyInput(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function parseIntInput(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizePriority(value: FormDataEntryValue | null): PlanPriority {
  const allowed: PlanPriority[] = ["Высокий", "Средний", "Низкий"];
  if (typeof value === "string" && allowed.includes(value as PlanPriority)) {
    return value as PlanPriority;
  }
  return "Средний";
}

export async function addCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const kind = String(formData.get("kind") || "").trim() as CategoryKind;
  const name = String(formData.get("name") || "").trim();
  const parentId = normalizeParent(formData.get("parent_id"));

  if (!name) throw new Error("Укажите название категории");
  if (!["income", "expense", "transfer", "both"].includes(kind)) throw new Error("Некорректный тип категории");

  if (parentId) {
    const { data: parent, error: parentErr } = await supabase
      .from("categories")
      .select("id,kind,user_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentErr) throw parentErr;
    if (!parent || parent.user_id !== userId) throw new Error("Родительская категория не найдена");
    
    // Проверяем совместимость типов
    const isCompatible = 
      parent.kind === kind || 
      parent.kind === "both" || 
      kind === "both" ||
      (parent.kind === "income" && kind === "income") ||
      (parent.kind === "expense" && kind === "expense");
    
    if (!isCompatible) throw new Error("Родитель должен быть совместимого типа");
  }

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userId, kind, name, parent_id: parentId });
  if (error) throw error;
  revalidatePath("/settings");
}

export async function addPlanType(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Укажите название типа");

  const icon = String(formData.get("icon") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  const sortOrder = parseIntInput(formData.get("sort_order")) ?? 0;

  const { error } = await supabase
    .from("plan_types")
    .insert({
      user_id: userId,
      name,
      icon,
      color,
      sort_order: sortOrder,
    });
  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function updatePlanType(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) throw new Error("Данные не полные");

  const icon = String(formData.get("icon") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  const sortOrder = parseIntInput(formData.get("sort_order"));

  const { error } = await supabase
    .from("plan_types")
    .update({
      name,
      icon,
      color,
      sort_order: sortOrder ?? 0,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function deletePlanType(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Нет id");

  const { data: existing, error: findErr } = await supabase
    .from("plan_types")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new Error("Тип плана не найден");

  await supabase.from("plan_presets").update({ plan_type_id: null }).eq("plan_type_id", id).eq("user_id", userId);
  await supabase.from("plans").update({ plan_type_id: null }).eq("plan_type_id", id).eq("user_id", userId);

  const { error } = await supabase
    .from("plan_types")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function addPlanPreset(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Укажите название пресета");

  const planTypeId = normalizeParent(formData.get("plan_type_id"));
  if (planTypeId) {
    const { data: typeCheck, error: typeErr } = await supabase
      .from("plan_types")
      .select("id")
      .eq("id", planTypeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (typeErr) throw typeErr;
    if (!typeCheck) throw new Error("Тип плана не найден");
  }

  const goal = parseMoneyInput(formData.get("goal_amount"));
  const monthly = parseMoneyInput(formData.get("monthly_contribution"));
  const priority = normalizePriority(formData.get("priority"));
  const note = String(formData.get("note") || "").trim() || null;
  const icon = String(formData.get("icon") || "").trim() || null;
  const sortOrder = parseIntInput(formData.get("sort_order")) ?? 0;

  const { error } = await supabase
    .from("plan_presets")
    .insert({
      user_id: userId,
      name,
      plan_type_id: planTypeId,
      goal_amount: goal,
      monthly_contribution: monthly,
      priority,
      note,
      icon,
      sort_order: sortOrder,
    });
  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function updatePlanPreset(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) throw new Error("Данные не полные");

  const planTypeId = normalizeParent(formData.get("plan_type_id"));
  if (planTypeId) {
    const { data: typeCheck, error: typeErr } = await supabase
      .from("plan_types")
      .select("id")
      .eq("id", planTypeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (typeErr) throw typeErr;
    if (!typeCheck) throw new Error("Тип плана не найден");
  }

  const goal = parseMoneyInput(formData.get("goal_amount"));
  const monthly = parseMoneyInput(formData.get("monthly_contribution"));
  const priority = normalizePriority(formData.get("priority"));
  const note = String(formData.get("note") || "").trim() || null;
  const icon = String(formData.get("icon") || "").trim() || null;
  const sortOrder = parseIntInput(formData.get("sort_order")) ?? 0;

  const { error } = await supabase
    .from("plan_presets")
    .update({
      name,
      plan_type_id: planTypeId,
      goal_amount: goal,
      monthly_contribution: monthly,
      priority,
      note,
      icon,
      sort_order: sortOrder,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function deletePlanPreset(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Нет id");

  const { error } = await supabase
    .from("plan_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/settings");
  return { success: true };
}

export async function renameCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "").trim() as CategoryKind;
  const parentId = normalizeParent(formData.get("parent_id"));

  if (!id || !name) throw new Error("Данные не полные");
  if (!["income", "expense", "transfer", "both"].includes(kind)) throw new Error("Некорректный тип категории");

  const { data: categories, error: catsErr } = await supabase
    .from("categories")
    .select("id,parent_id,kind")
    .eq("user_id", userId);
  if (catsErr) throw catsErr;

  const current = categories?.find((c) => c.id === id);
  if (!current) throw new Error("Категория не найдена");

  if (parentId === id) throw new Error("Категория не может быть родителем самой себя");

  if (parentId) {
    const parent = categories?.find((c) => c.id === parentId);
    if (!parent) throw new Error("Родительская категория не найдена");
    
    // Проверяем совместимость типов
    const isCompatible = 
      parent.kind === kind || 
      parent.kind === "both" || 
      kind === "both" ||
      (parent.kind === "income" && kind === "income") ||
      (parent.kind === "expense" && kind === "expense");
    
    if (!isCompatible) throw new Error("Родитель должен быть совместимого типа");

    // Проверка на циклы: поднимемся по цепочке родителей
    const map = new Map<string, string | null>();
    for (const cat of categories ?? []) {
      map.set(cat.id, cat.parent_id ?? null);
    }
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === id) {
        throw new Error("Нельзя назначить потомка родителем");
      }
      cursor = map.get(cursor) ?? null;
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({ name, kind, parent_id: parentId })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/settings");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Нет id");

  const { data: current, error: currentErr } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (currentErr) throw currentErr;
  if (!current) throw new Error("Категория не найдена");

  const { error: childErr } = await supabase
    .from("categories")
    .update({ parent_id: null })
    .eq("parent_id", id)
    .eq("user_id", userId);
  if (childErr) throw childErr;

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/settings");
}
