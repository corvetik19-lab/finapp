"use server";
import { revalidatePath } from "next/cache";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function addCategory(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Нет пользователя");

  const kind = String(formData.get("kind") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Укажите название категории");
  if (!["income", "expense"].includes(kind)) throw new Error("Некорректный тип");

  const { error } = await supabase.from("categories").insert({ user_id: user.id, kind, name });
  if (error) throw error;
  revalidatePath("/settings");
}

export async function renameCategory(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Нет пользователя");

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) throw new Error("Данные не полные");

  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нет пользователя");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Нет id");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
}
