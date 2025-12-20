"use server";

import { createRouteClient } from "@/lib/supabase/server";
import { ALL_MODES, type AppModeKey } from "./modes-config";
import { logger } from "@/lib/logger";

// Re-export для удобства (но эти экспорты будут работать только в серверных компонентах)
// Для клиентских компонентов импортируйте напрямую из modes-config.ts

/**
 * Получить список включённых режимов платформы
 */
export async function getEnabledModes(): Promise<AppModeKey[]> {
  const supabase = await createRouteClient();
  
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "enabled_modes")
    .single();

  if (error || !data) {
    // Fallback - все режимы включены
    return ["finance", "tenders", "personal", "investments", "ai_studio"];
  }

  const modes = data.value as AppModeKey[];
  
  // Всегда добавляем ai_studio если его нет в списке
  if (!modes.includes("ai_studio")) {
    modes.push("ai_studio");
  }
  
  return modes;
}

/**
 * Обновить список включённых режимов (только для супер-админа)
 * Минимум 1 режим должен быть включён
 */
export async function updateEnabledModes(modes: AppModeKey[]): Promise<{ ok: boolean; error?: string }> {
  // Валидация - минимум 1 режим
  if (!modes || modes.length === 0) {
    return { ok: false, error: "Минимум один режим должен быть включён" };
  }

  // Проверка что все режимы валидные
  const validModes = ALL_MODES.map(m => m.key);
  const invalidModes = modes.filter(m => !validModes.includes(m));
  if (invalidModes.length > 0) {
    return { ok: false, error: `Неизвестные режимы: ${invalidModes.join(", ")}` };
  }

  const supabase = await createRouteClient();

  // Проверяем что пользователь - супер-админ
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Не авторизован" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();

  if (profile?.global_role !== "super_admin") {
    return { ok: false, error: "Доступ запрещён" };
  }

  // Обновляем настройку
  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key: "enabled_modes",
      value: modes,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });

  if (error) {
    logger.error("Error updating enabled modes:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Получить все глобальные настройки платформы
 */
export async function getAllPlatformSettings(): Promise<Record<string, unknown>> {
  const supabase = await createRouteClient();
  
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value");

  if (error || !data) {
    return {};
  }

  return Object.fromEntries(data.map((row: { key: string; value: unknown }) => [row.key, row.value]));
}
