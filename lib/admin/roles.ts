"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface RoleConfig {
  id: string;
  role_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  allowed_modules: string[];
  sort_order: number;
  is_active: boolean;
}

/**
 * Получить все конфигурации ролей
 */
export async function getRoleConfigs(): Promise<RoleConfig[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("role_configs")
    .select("*")
    .order("sort_order", { ascending: true });
  
  if (error) {
    logger.error("Error fetching role configs:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Обновить конфигурации ролей
 */
export async function updateRoleConfigs(roles: RoleConfig[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  
  // Обновляем каждую роль
  for (const role of roles) {
    const { error } = await supabase
      .from("role_configs")
      .update({
        allowed_modules: role.allowed_modules,
        is_active: role.is_active,
      })
      .eq("id", role.id);
    
    if (error) {
      logger.error("Error updating role config:", error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: true };
}

/**
 * Получить разрешённые модули для роли
 */
export async function getAllowedModulesForRole(roleKey: string): Promise<string[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("role_configs")
    .select("allowed_modules")
    .eq("role_key", roleKey)
    .eq("is_active", true)
    .single();
  
  if (error || !data) {
    return [];
  }
  
  return data.allowed_modules || [];
}

/**
 * Проверить доступ роли к модулю
 */
export async function hasModuleAccess(roleKey: string, moduleKey: string): Promise<boolean> {
  const allowedModules = await getAllowedModulesForRole(roleKey);
  
  // Если есть '*' - доступ ко всем модулям
  if (allowedModules.includes("*")) {
    return true;
  }
  
  return allowedModules.includes(moduleKey);
}
