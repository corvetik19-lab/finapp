/**
 * Organization helpers для работы с мультитенантностью
 */

import { createRouteClient } from "@/lib/supabase/server";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationModeSettings {
  id: string;
  org_id: string;
  mode_key: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
}

/**
 * Получить текущую организацию пользователя
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Получаем первую организацию пользователя
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.org_id)
    .single();

  return org;
}

/**
 * Получить все организации пользователя
 */
export async function getUserOrganizations(): Promise<Organization[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) return [];

  const orgIds = memberships.map(m => m.org_id);
  
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds)
    .order('created_at', { ascending: true });

  return orgs || [];
}

/**
 * Получить роль пользователя в организации
 */
export async function getUserRole(orgId: string): Promise<string | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();

  return membership?.role || null;
}

/**
 * Проверить, является ли пользователь владельцем организации
 */
export async function isOrganizationOwner(orgId: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single();

  return org?.owner_id === user.id;
}

/**
 * Проверить, является ли пользователь админом или владельцем
 */
export async function isOrganizationAdmin(orgId: string): Promise<boolean> {
  const role = await getUserRole(orgId);
  return role === 'owner' || role === 'admin';
}

/**
 * Получить настройки режима для организации
 */
export async function getModeSetting(
  orgId: string,
  modeKey: string
): Promise<OrganizationModeSettings | null> {
  const supabase = await createRouteClient();

  const { data } = await supabase
    .from('organization_mode_settings')
    .select('*')
    .eq('org_id', orgId)
    .eq('mode_key', modeKey)
    .single();

  return data;
}

/**
 * Получить все настройки режимов для организации
 */
export async function getAllModeSettings(
  orgId: string
): Promise<OrganizationModeSettings[]> {
  const supabase = await createRouteClient();

  const { data } = await supabase
    .from('organization_mode_settings')
    .select('*')
    .eq('org_id', orgId)
    .order('mode_key');

  return data || [];
}

/**
 * Проверить, включён ли режим для организации
 */
export async function isModeEnabled(
  orgId: string,
  modeKey: string
): Promise<boolean> {
  const setting = await getModeSetting(orgId, modeKey);
  return setting?.is_enabled ?? false;
}

/**
 * Создать новую организацию
 */
export async function createOrganization(
  name: string,
  slug: string
): Promise<Organization | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Создаём организацию
  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error || !org) return null;

  // Добавляем пользователя как владельца
  await supabase
    .from('organization_members')
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: 'owner',
    });

  // Создаём дефолтные настройки режимов
  await supabase
    .from('organization_mode_settings')
    .insert([
      {
        org_id: org.id,
        mode_key: 'finance',
        is_enabled: true,
      },
      {
        org_id: org.id,
        mode_key: 'investments',
        is_enabled: false,
      },
      {
        org_id: org.id,
        mode_key: 'personal',
        is_enabled: false,
      },
      {
        org_id: org.id,
        mode_key: 'tenders',
        is_enabled: false,
      },
    ]);

  return org;
}
