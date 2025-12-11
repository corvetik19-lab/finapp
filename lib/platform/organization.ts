/**
 * Organization helpers    
 */

import { createRouteClient, getCachedUser } from "@/lib/supabase/server";
import { AppMode, Organization, MemberPermissions } from "@/lib/organizations/types";
import { cache } from "react";

/**
 *    
 */
export const getCurrentOrganization = cache(async (): Promise<Organization | null> => {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createRouteClient();

  //    
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!membership) {
    return null;
  }

  //    
  const { data: company } = await supabase
    .from('companies')
    .select('organization:organizations(*)')
    .eq('id', membership.company_id)
    .single();

  if (!company || !company.organization) {
    return null;
  }

  //    Organization (casting as unknown needed because of join structure)
  const org = company.organization as unknown as Organization;
  
  // ,  allowed_modes  
  if (!Array.isArray(org.allowed_modes)) {
    org.allowed_modes = [];
  }

  return org;
});

/**
 *  ID   
 */
export const getCurrentCompanyId = cache(async (): Promise<string | null> => {
  const { data: { user } } = await getCachedUser();
  if (!user) return null;

  const supabase = await createRouteClient();

  //   active_company_id   ( -    )
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_company_id, global_role')
    .eq('id', user.id)
    .single();

  //  -     -  
  if (profile?.active_company_id && profile?.global_role === 'super_admin') {
    return profile.active_company_id;
  }

  //  -  active_company_id -    (System Company)
  if (profile?.global_role === 'super_admin') {
    // Ищем системную организацию по описанию
    const { data: systemOrg } = await supabase
      .from('organizations')
      .select('id')
      .ilike('description', '%системная организация супер-администратора%')
      .limit(1)
      .single();

    if (systemOrg) {
      const { data: systemCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('organization_id', systemOrg.id)
        .limit(1)
        .single();

      return systemCompany?.id || null;
    }
  }

  //     
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
 *      ( -)
 *  null     
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
    organizationName: org?.name || ''
  };
});


/**
 * ,     
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
 *     
 */
export async function hasUserModeAccess(mode: AppMode): Promise<boolean> {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createRouteClient();

  // 1.  -
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('hasUserModeAccess: Profile fetch error', profileError);
  }

  if (profile?.global_role === 'super_admin') {
    return true;
  }

  const org = await getCurrentOrganization();
  if (!org) {
    return false;
  }

  // ,     
  //       -
  if (!org.allowed_modes?.includes(mode)) {
    return false;
  }

  // 3. Проверяем company_members и связанную роль
  const { data: member } = await supabase
    .from('company_members')
    .select('role, permissions, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!member) {
    return false;
  }

  // Админ имеет полный доступ
  if (member.role === 'admin') {
    return true;
  }

  // Проверяем permissions из member напрямую
  const memberPermissions = member.permissions as unknown as MemberPermissions;
  if (memberPermissions?.allowed_modes?.includes(mode)) {
    return true;
  }

  // Если есть role_id - проверяем permissions роли
  if (member.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', member.role_id)
      .single();
    
    if (roleData?.permissions) {
      const rolePermissions = roleData.permissions as string[];
      // Проверяем есть ли хоть одно право начинающееся с mode: (например tenders:view)
      const hasRoleAccess = rolePermissions.some(p => p.startsWith(`${mode}:`));
      if (hasRoleAccess) {
        return true;
      }
    }
  }
  
  return false;
}
