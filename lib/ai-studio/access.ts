/**
 * AI Studio Access Control
 * Управление доступом к Gemini AI Studio
 */

import { createRouteClient } from "@/lib/supabase/server";

// Супер-админ email
const SUPER_ADMIN_EMAIL = "corvetik1@yandex.ru";

/**
 * Проверяет, является ли пользователь супер-админом
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

/**
 * Проверяет доступ пользователя к AI Studio
 */
export async function hasAIStudioAccess(
  userId: string,
  email: string | null | undefined
): Promise<boolean> {
  // Супер-админ всегда имеет доступ
  if (isSuperAdmin(email)) {
    return true;
  }

  try {
    const supabase = await createRouteClient();

    // Получаем организацию пользователя (проверяем обе таблицы)
    let organizationId: string | null = null;
    
    // Сначала проверяем organization_members
    const { data: orgMembership } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();
    
    if (orgMembership?.org_id) {
      organizationId = orgMembership.org_id;
    } else {
      // Проверяем company_members -> companies -> organizations
      const { data: companyMembership } = await supabase
        .from("company_members")
        .select("company:companies(organization_id)")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      if (companyMembership?.company) {
        const company = companyMembership.company as { organization_id?: string };
        organizationId = company.organization_id || null;
      }
    }

    if (!organizationId) {
      return false;
    }

    // Проверяем доступ организации к AI Studio
    const { data: access } = await supabase
      .from("ai_studio_access")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt.now()")
      .single();

    return !!access;
  } catch {
    return false;
  }
}

/**
 * Получает информацию о доступе пользователя
 */
export async function getAIStudioAccessInfo(
  userId: string,
  email: string | null | undefined
): Promise<{
  hasAccess: boolean;
  isSuperAdmin: boolean;
  features: Record<string, boolean>;
  expiresAt: string | null;
}> {
  const superAdmin = isSuperAdmin(email);

  if (superAdmin) {
    return {
      hasAccess: true,
      isSuperAdmin: true,
      features: { all: true },
      expiresAt: null,
    };
  }

  try {
    const supabase = await createRouteClient();

    // Получаем организацию пользователя (проверяем обе таблицы)
    let organizationId: string | null = null;
    
    // Сначала проверяем organization_members
    const { data: orgMembership } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();
    
    if (orgMembership?.org_id) {
      organizationId = orgMembership.org_id;
    } else {
      // Проверяем company_members -> companies -> organizations
      const { data: companyMembership } = await supabase
        .from("company_members")
        .select("company:companies(organization_id)")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      if (companyMembership?.company) {
        const company = companyMembership.company as { organization_id?: string };
        organizationId = company.organization_id || null;
      }
    }

    if (!organizationId) {
      return {
        hasAccess: false,
        isSuperAdmin: false,
        features: {},
        expiresAt: null,
      };
    }

    // Проверяем роль пользователя - если роль имеет ai-studio в allowed_modes
    const { data: memberWithRole } = await supabase
      .from("company_members")
      .select("role_id, roles(allowed_modes, permissions)")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (memberWithRole?.roles) {
      const role = memberWithRole.roles as { allowed_modes?: string[] | null; permissions?: string[] };
      // Проверяем allowed_modes роли
      if (role.allowed_modes?.includes("ai-studio")) {
        return {
          hasAccess: true,
          isSuperAdmin: false,
          features: { all: true },
          expiresAt: null,
        };
      }
      // Проверяем permissions роли
      if (role.permissions?.some(p => p.startsWith("ai-studio:"))) {
        return {
          hasAccess: true,
          isSuperAdmin: false,
          features: { all: true },
          expiresAt: null,
        };
      }
    }

    // Получаем доступ организации через ai_studio_access
    const { data: access } = await supabase
      .from("ai_studio_access")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt.now()")
      .single();

    if (!access) {
      return {
        hasAccess: false,
        isSuperAdmin: false,
        features: {},
        expiresAt: null,
      };
    }

    return {
      hasAccess: true,
      isSuperAdmin: false,
      features: (access.features as Record<string, boolean>) || { all: true },
      expiresAt: access.expires_at,
    };
  } catch {
    return {
      hasAccess: false,
      isSuperAdmin: false,
      features: {},
      expiresAt: null,
    };
  }
}

/**
 * Выдаёт доступ организации к AI Studio (только для супер-админа)
 */
export async function grantAIStudioAccess(
  organizationId: string,
  grantedBy: string,
  options: {
    features?: Record<string, boolean>;
    expiresAt?: string | null;
    notes?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createRouteClient();

    const { error } = await supabase.from("ai_studio_access").insert({
      organization_id: organizationId,
      granted_by: grantedBy,
      features: options.features || { all: true },
      expires_at: options.expiresAt || null,
      notes: options.notes || null,
      is_active: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Отзывает доступ организации к AI Studio
 */
export async function revokeAIStudioAccess(
  accessId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from("ai_studio_access")
      .update({ is_active: false })
      .eq("id", accessId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Получает список всех доступов (только для супер-админа)
 */
export async function getAllAIStudioAccess(): Promise<
  Array<{
    id: string;
    organization_id: string;
    organization_name?: string;
    granted_at: string;
    expires_at: string | null;
    is_active: boolean;
    features: Record<string, boolean>;
  }>
> {
  try {
    const supabase = await createRouteClient();

    const { data } = await supabase
      .from("ai_studio_access")
      .select(
        `
        *,
        organizations (name)
      `
      )
      .order("created_at", { ascending: false });

    return (data || []).map((item) => ({
      id: item.id,
      organization_id: item.organization_id,
      organization_name: (item.organizations as { name: string } | null)?.name,
      granted_at: item.granted_at,
      expires_at: item.expires_at,
      is_active: item.is_active,
      features: item.features as Record<string, boolean>,
    }));
  } catch {
    return [];
  }
}

/**
 * Логирует использование AI Studio
 */
export async function logAIStudioUsage(
  userId: string,
  organizationId: string | null,
  feature: "chat" | "image" | "video" | "audio" | "document" | "research",
  model: string,
  tokensInput: number,
  tokensOutput: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createRouteClient();

    await supabase.from("ai_studio_usage_logs").insert({
      user_id: userId,
      organization_id: organizationId,
      feature,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      metadata,
    });
  } catch {
    // Ignore logging errors
  }
}
