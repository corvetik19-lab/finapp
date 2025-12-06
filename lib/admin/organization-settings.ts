"use server";

import { createRouteClient } from "@/lib/supabase/server";

/**
 * Обновить список режимов для организации (для админа организации)
 */
export async function updateOrganizationModes(
  organizationId: string, 
  modes: string[]
): Promise<{ ok: boolean; error?: string }> {
  // Валидация - минимум 1 режим
  if (!modes || modes.length === 0) {
    return { ok: false, error: "Минимум один режим должен быть включён" };
  }

  const supabase = await createRouteClient();

  // Проверяем что пользователь - админ этой организации
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Не авторизован" };
  }

  // Проверяем права на организацию (должен быть admin или owner)
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["admin", "owner"].includes(membership.role)) {
    // Проверяем также супер-админа
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profile?.global_role !== "super_admin") {
      return { ok: false, error: "Нет прав на изменение настроек организации" };
    }
  }

  // Обновляем режимы организации
  const { error } = await supabase
    .from("organizations")
    .update({ 
      allowed_modes: modes,
    })
    .eq("id", organizationId);

  if (error) {
    console.error("Error updating organization modes:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Получить настройки организации
 */
export async function getOrganizationSettings(organizationId: string) {
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error) {
    console.error("Error fetching organization settings:", error);
    return null;
  }

  return data;
}
