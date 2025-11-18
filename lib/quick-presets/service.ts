"use server";

import { createRouteClient } from "@/lib/supabase/helpers";
import type { QuickTransactionPreset, QuickPresetInput, QuickPresetUpdate } from "@/types/quick-preset";

/**
 * Получить все быстрые пресеты пользователя
 */
export async function getQuickPresets(): Promise<QuickTransactionPreset[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { data, error } = await supabase
    .from("quick_transaction_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("direction", { ascending: false }) // income первыми
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching quick presets:", error);
    throw new Error(`Ошибка при получении быстрых пресетов: ${error.message}`);
  }

  return (data as QuickTransactionPreset[]) || [];
}

/**
 * Создать новый быстрый пресет
 */
export async function createQuickPreset(input: QuickPresetInput): Promise<QuickTransactionPreset> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { data, error } = await supabase
    .from("quick_transaction_presets")
    .insert({
      user_id: user.id,
      name: input.name,
      amount: input.amount,
      direction: input.direction,
      category_id: input.category_id || null,
      account_id: input.account_id || null,
      sort_order: input.sort_order,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating quick preset:", error);
    throw new Error(`Ошибка при создании быстрого пресета: ${error.message}`);
  }

  return data as QuickTransactionPreset;
}

/**
 * Обновить быстрый пресет
 */
export async function updateQuickPreset(update: QuickPresetUpdate): Promise<QuickTransactionPreset> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const updateData: Partial<Omit<QuickTransactionPreset, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {};
  if (update.name !== undefined) updateData.name = update.name;
  if (update.amount !== undefined) updateData.amount = update.amount;
  if (update.direction !== undefined) updateData.direction = update.direction;
  if (update.category_id !== undefined) updateData.category_id = update.category_id;
  if (update.account_id !== undefined) updateData.account_id = update.account_id;
  if (update.sort_order !== undefined) updateData.sort_order = update.sort_order;

  const { data, error } = await supabase
    .from("quick_transaction_presets")
    .update(updateData)
    .eq("id", update.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating quick preset:", error);
    throw new Error(`Ошибка при обновлении быстрого пресета: ${error.message}`);
  }

  return data as QuickTransactionPreset;
}

/**
 * Удалить быстрый пресет
 */
export async function deleteQuickPreset(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { error } = await supabase
    .from("quick_transaction_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting quick preset:", error);
    throw new Error(`Ошибка при удалении быстрого пресета: ${error.message}`);
  }
}
