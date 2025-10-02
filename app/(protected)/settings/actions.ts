"use server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

type CategoryKind = "income" | "expense" | "transfer";

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

export async function addCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const kind = String(formData.get("kind") || "").trim() as CategoryKind;
  const name = String(formData.get("name") || "").trim();
  const parentId = normalizeParent(formData.get("parent_id"));

  if (!name) throw new Error("Укажите название категории");
  if (!["income", "expense", "transfer"].includes(kind)) throw new Error("Некорректный тип категории");

  if (parentId) {
    const { data: parent, error: parentErr } = await supabase
      .from("categories")
      .select("id,kind,user_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentErr) throw parentErr;
    if (!parent || parent.user_id !== userId) throw new Error("Родительская категория не найдена");
    if (parent.kind !== kind) throw new Error("Родитель должен быть того же типа");
  }

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userId, kind, name, parent_id: parentId });
  if (error) throw error;
  revalidatePath("/settings");
}

export async function renameCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const parentId = normalizeParent(formData.get("parent_id"));

  if (!id || !name) throw new Error("Данные не полные");

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
    if (parent.kind !== current.kind) throw new Error("Родитель должен быть того же типа");

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
    .update({ name, parent_id: parentId })
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
