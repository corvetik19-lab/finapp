"use server";

import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Platform, PlatformInput, PlatformFilters } from "@/types/platform";

/**
 * Получить список площадок с фильтрацией
 */
export async function getPlatforms(filters?: PlatformFilters): Promise<Platform[]> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return [];
  }

  let query = supabase
    .from("tender_platforms")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  // Фильтр по активности
  if (filters?.is_active !== undefined && filters.is_active !== 'all') {
    query = query.eq("is_active", filters.is_active);
  }

  // Поиск по названию
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%,url.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching platforms:", error);
    return [];
  }

  return data || [];
}

/**
 * Получить площадку по ID
 */
export async function getPlatformById(id: string): Promise<Platform | null> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const { data, error } = await supabase
    .from("tender_platforms")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .single();

  if (error) {
    console.error("Error fetching platform:", error);
    return null;
  }

  return data;
}

/**
 * Создать площадку
 */
export async function createPlatform(input: PlatformInput): Promise<{ success: boolean; data?: Platform; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tender_platforms")
    .insert({
      organization_id: organization.id,
      created_by: user?.id,
      name: input.name,
      short_name: input.short_name || null,
      url: input.url || null,
      description: input.description || null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating platform:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Обновить площадку
 */
export async function updatePlatform(id: string, input: Partial<PlatformInput>): Promise<{ success: boolean; data?: Platform; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { data, error } = await supabase
    .from("tender_platforms")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating platform:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Удалить площадку
 */
export async function deletePlatform(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { error } = await supabase
    .from("tender_platforms")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    console.error("Error deleting platform:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Переключить активность площадки
 */
export async function togglePlatformActive(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  // Получаем текущее состояние
  const { data: current } = await supabase
    .from("tender_platforms")
    .select("is_active")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .single();

  if (!current) {
    return { success: false, error: "Площадка не найдена" };
  }

  // Переключаем
  const { error } = await supabase
    .from("tender_platforms")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    console.error("Error toggling platform active:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Получить статистику по площадкам
 */
export async function getPlatformsStats(): Promise<{
  total: number;
  active: number;
}> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { total: 0, active: 0 };
  }

  const { data, error } = await supabase
    .from("tender_platforms")
    .select("id, is_active")
    .eq("organization_id", organization.id);

  if (error || !data) {
    return { total: 0, active: 0 };
  }

  const active = data.filter(p => p.is_active).length;

  return {
    total: data.length,
    active,
  };
}

/**
 * Получить количество тендеров по площадке (по ID)
 */
export async function getPlatformTendersCount(platformId: string): Promise<number> {
  const supabase = await createRSCClient();
  
  const { count, error } = await supabase
    .from("tenders")
    .select("id", { count: 'exact', head: true })
    .eq("platform_id", platformId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error fetching platform tenders count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Получить тендеры по площадке (по ID)
 */
export async function getPlatformTenders(platformId: string, limit = 10): Promise<{
  id: string;
  purchase_number: string;
  subject: string;
  nmck: number;
  status: string;
  customer: string;
}[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("tenders")
    .select(`
      id,
      purchase_number,
      subject,
      nmck,
      status,
      customer
    `)
    .eq("platform_id", platformId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching platform tenders:", error);
    return [];
  }

  return (data || []).map((t: { id: string; purchase_number: string; subject: string; nmck: number; status: string; customer: string }) => ({
    id: t.id,
    purchase_number: t.purchase_number,
    subject: t.subject,
    nmck: t.nmck || 0,
    status: t.status,
    customer: t.customer || '',
  }));
}

/**
 * Получить статистику тендеров для всех площадок организации
 */
export async function getPlatformsTendersStats(): Promise<Record<string, number>> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return {};
  }

  const { data, error } = await supabase
    .from("tenders")
    .select("platform_id")
    .not("platform_id", "is", null)
    .is("deleted_at", null);

  if (error || !data) {
    return {};
  }

  // Подсчитываем количество тендеров для каждой площадки
  const stats: Record<string, number> = {};
  data.forEach((t: { platform_id: string }) => {
    if (t.platform_id) {
      stats[t.platform_id] = (stats[t.platform_id] || 0) + 1;
    }
  });

  return stats;
}
