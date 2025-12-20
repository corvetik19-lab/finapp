/**
 * Organization helpers РґР»СЏ СЂР°Р±РѕС‚С‹ СЃ РјСѓР»СЊС‚РёС‚РµРЅР°РЅС‚РЅРѕСЃС‚СЊСЋ
 */

import { createRouteClient, getCachedUser } from "@/lib/supabase/server";
import { AppMode, Organization, MemberPermissions } from "@/lib/organizations/types";
import { cache } from "react";
import { logger } from "@/lib/logger";

/**
 * РџРѕР»СѓС‡РёС‚СЊ С‚РµРєСѓС‰СѓСЋ РѕСЂРіР°РЅРёР·Р°С†РёСЋ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
export const getCurrentOrganization = cache(async (): Promise<Organization | null> => {
  const { data: { user } } = await getCachedUser();
  if (!user) return null;

  const supabase = await createRouteClient();

  // РџРѕР»СѓС‡Р°РµРј РїРµСЂРІСѓСЋ РєРѕРјРїР°РЅРёСЋ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!membership) return null;

  // РџРѕР»СѓС‡Р°РµРј РѕСЂРіР°РЅРёР·Р°С†РёСЋ С‡РµСЂРµР· РєРѕРјРїР°РЅРёСЋ
  const { data: company } = await supabase
    .from('companies')
    .select('organization:organizations(*)')
    .eq('id', membership.company_id)
    .single();

  if (!company || !company.organization) return null;

  // РџСЂРёРІРѕРґРёРј Рє С‚РёРїСѓ Organization (casting as unknown needed because of join structure)
  const org = company.organization as unknown as Organization;
  
  // РЈР±РµРґРёРјСЃСЏ, С‡С‚Рѕ allowed_modes СЌС‚Рѕ РјР°СЃСЃРёРІ
  if (!Array.isArray(org.allowed_modes)) {
    org.allowed_modes = [];
  }

  return org;
});

/**
 * РџРѕР»СѓС‡РёС‚СЊ ID С‚РµРєСѓС‰РµР№ РєРѕРјРїР°РЅРёРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
export const getCurrentCompanyId = cache(async (): Promise<string | null> => {
  const { data: { user } } = await getCachedUser();
  if (!user) return null;

  const supabase = await createRouteClient();

  // Сначала проверяем active_company_id в профиле (для супер-админа работающего от имени организации)
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_company_id, global_role')
    .eq('id', user.id)
    .single();

  // Если супер-админ и есть активная компания - используем её
  if (profile?.active_company_id && profile?.global_role === 'super_admin') {
    return profile.active_company_id;
  }

  // Иначе получаем последнюю компанию пользователя
  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1);

  return memberships?.[0]?.company_id || null;
});

/**
 * Получить информацию об активной организации (для супер-админа)
 * Возвращает null если работает от своего имени
 */
export const getActiveOrganizationInfo = cache(async (): Promise<{
  companyId: string;
  companyName: string;
  organizationName: string;
} | null> => {
  const { data: { user } } = await getCachedUser();
  if (!user) return null;

  const supabase = await createRouteClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_company_id, global_role')
    .eq('id', user.id)
    .single();

  if (!profile?.active_company_id || profile?.global_role !== 'super_admin') {
    return null;
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, organization:organizations(name)')
    .eq('id', profile.active_company_id)
    .single();

  if (!company) return null;

  const org = company.organization as unknown as { name: string };

  return {
    companyId: company.id,
    companyName: company.name,
    organizationName: org?.name || 'Неизвестно'
  };
});


/**
 * РџСЂРѕРІРµСЂРёС‚СЊ, РІРєР»СЋС‡С‘РЅ Р»Рё СЂРµР¶РёРј РґР»СЏ РѕСЂРіР°РЅРёР·Р°С†РёРё
 */
export async function isModeEnabled(
  orgId: string,
  modeKey: AppMode
): Promise<boolean> {
  const supabase = await createRouteClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('allowed_modes')
    .eq('id', orgId)
    .single();

  if (!org || !org.allowed_modes) return false;
  
  return (org.allowed_modes as string[]).includes(modeKey);
}

/**
 * РџСЂРѕРІРµСЂРёС‚СЊ РґРѕСЃС‚СѓРї РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рє СЂРµР¶РёРјСѓ
 */
export async function hasUserModeAccess(mode: AppMode): Promise<boolean> {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createRouteClient();

  // 1. РџСЂРѕРІРµСЂРєР° СЃСѓРїРµСЂ-Р°РґРјРёРЅР°
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    logger.error('hasUserModeAccess: Profile fetch error', profileError);
  }

  if (profile?.global_role === 'super_admin') {
    return true;
  }

  const org = await getCurrentOrganization();
  if (!org) {
    return false;
  }

  // Проверяем, включен ли режим в организации
  // Это ограничение действует для всех КРОМЕ супер-админа
  if (!org.allowed_modes?.includes(mode)) {
    return false;
  }

  // 3. Проверяем права пользователя в company_members
  const { data: member } = await supabase
    .from('company_members')
    .select('role, permissions')
    .eq('user_id', user.id)
    // Р—РґРµСЃСЊ РЅСѓР¶РЅРѕ Р·РЅР°С‚СЊ company_id, РЅРѕ РјС‹ РїСЂРµРґРїРѕР»Р°РіР°РµРј С‚РµРєСѓС‰СѓСЋ Р°РєС‚РёРІРЅСѓСЋ РєРѕРјРїР°РЅРёСЋ
    // Р”Р»СЏ СѓРїСЂРѕС‰РµРЅРёСЏ РІРѕР·СЊРјРµРј Р»СЋР±СѓСЋ Р°РєС‚РёРІРЅСѓСЋ (РєР°Рє РІ getCurrentOrganization)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!member) {
    return false;
  }

  // РђРґРјРёРЅ РєРѕРјРїР°РЅРёРё РёРјРµРµС‚ РґРѕСЃС‚СѓРї РєРѕ РІСЃРµРј РІРєР»СЋС‡РµРЅРЅС‹Рј СЂРµР¶РёРјР°Рј
  if (member.role === 'admin') {
    return true;
  }

  // РџСЂРѕРІРµСЂСЏРµРј permissions
  const permissions = member.permissions as unknown as MemberPermissions;
  const allowedModes = permissions?.allowed_modes;
  const hasAccess = allowedModes?.includes(mode) || false;
  
  return hasAccess;
}

