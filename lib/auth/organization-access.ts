import { createAdminClient } from '@/lib/supabase/admin';

export interface OrganizationAccessResult {
  hasAccess: boolean;
  reason?: 'blocked' | 'subscription_expired' | 'subscription_cancelled' | 'no_subscription';
  organization?: {
    id: string;
    name: string;
    is_blocked: boolean;
    blocked_reason?: string;
  };
  subscription?: {
    status: string;
    current_period_end: string;
  };
}

/**
 * Проверить доступ пользователя к организации
 */
export async function checkOrganizationAccess(userId: string): Promise<OrganizationAccessResult> {
  const supabase = createAdminClient();

  // Получаем профиль пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', userId)
    .single();

  // Super admin всегда имеет доступ
  if (profile?.global_role === 'super_admin') {
    return { hasAccess: true };
  }

  // Получаем членство пользователя в компании
  const { data: membership } = await supabase
    .from('company_members')
    .select(`
      company_id,
      companies!inner (
        organization_id,
        organizations!inner (
          id,
          name,
          is_blocked,
          blocked_reason,
          owner_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    // Пользователь не состоит в организации - разрешаем доступ к личному пространству
    return { hasAccess: true };
  }

  const companyData = membership.companies as { 
    organization_id: string; 
    organizations: { 
      id: string; 
      name: string; 
      is_blocked: boolean; 
      blocked_reason?: string;
      owner_id?: string;
    } | { 
      id: string; 
      name: string; 
      is_blocked: boolean; 
      blocked_reason?: string;
      owner_id?: string;
    }[];
  } | { 
    organization_id: string; 
    organizations: { 
      id: string; 
      name: string; 
      is_blocked: boolean; 
      blocked_reason?: string;
      owner_id?: string;
    } | { 
      id: string; 
      name: string; 
      is_blocked: boolean; 
      blocked_reason?: string;
      owner_id?: string;
    }[];
  }[];
  
  const company = Array.isArray(companyData) ? companyData[0] : companyData;
  const orgsData = company.organizations;
  const org = Array.isArray(orgsData) ? orgsData[0] : orgsData;

  // Проверяем блокировку организации
  if (org.is_blocked) {
    return {
      hasAccess: false,
      reason: 'blocked',
      organization: {
        id: org.id,
        name: org.name,
        is_blocked: true,
        blocked_reason: org.blocked_reason,
      },
    };
  }

  // Проверяем подписку организации
  const { data: subscription } = await supabase
    .from('organization_subscriptions')
    .select('status, current_period_end')
    .eq('organization_id', org.id)
    .single();

  if (!subscription) {
    // Нет подписки - пока разрешаем (можно изменить на блокировку)
    return { hasAccess: true };
  }

  // Проверяем статус подписки
  if (subscription.status === 'expired' || subscription.status === 'past_due') {
    return {
      hasAccess: false,
      reason: 'subscription_expired',
      organization: {
        id: org.id,
        name: org.name,
        is_blocked: false,
      },
      subscription: {
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      },
    };
  }

  if (subscription.status === 'cancelled') {
    return {
      hasAccess: false,
      reason: 'subscription_cancelled',
      organization: {
        id: org.id,
        name: org.name,
        is_blocked: false,
      },
      subscription: {
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      },
    };
  }

  return { hasAccess: true };
}

/**
 * Заблокировать организацию
 */
export async function blockOrganization(
  organizationId: string,
  blockedBy: string,
  reason?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Нельзя блокировать личное пространство супер-админа
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id, name')
    .eq('id', organizationId)
    .single();

  if (!org) return false;

  // Проверяем что владелец не супер-админ
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', org.owner_id)
    .single();

  if (ownerProfile?.global_role === 'super_admin') {
    throw new Error('Нельзя заблокировать организацию супер-администратора');
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_by: blockedBy,
      blocked_reason: reason || null,
    })
    .eq('id', organizationId);

  return !error;
}

/**
 * Разблокировать организацию
 */
export async function unblockOrganization(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('organizations')
    .update({
      is_blocked: false,
      blocked_at: null,
      blocked_by: null,
      blocked_reason: null,
    })
    .eq('id', organizationId);

  return !error;
}
