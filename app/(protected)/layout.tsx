import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";
import PlatformHeader from "@/components/platform/PlatformHeader";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { OnlineStatusTracker } from "@/components/online/OnlineStatusTracker";
import { getCurrentOrganization, getActiveOrganizationInfo } from "@/lib/platform/organization";
import { getEnabledModes } from "@/lib/platform/platform-settings";
import { logger } from "@/lib/logger";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Параллельно загружаем независимые данные
  const [organization, activeOrgInfo, globalEnabledModes] = await Promise.all([
    getCurrentOrganization(),
    getActiveOrganizationInfo(),
    getEnabledModes(),
  ]);

  // Получаем контекст пользователя через оптимизированный RPC вызов
  let isSuperAdmin = false;
  let isOrgAdmin = false;
  let roleName: string | undefined;
  let departmentName: string | undefined;
  let position: string | undefined;
  let userPhone: string | undefined;
  let userCreatedAt: string | undefined;
  let userAvatarUrl: string | undefined;
  let userAllowedModes: string[] | undefined;
  
  try {
    const adminSupabase = createAdminClient();
    
    // Используем RPC для получения всех данных одним запросом
    const { data: context, error } = await adminSupabase
      .rpc('get_user_context', {
        p_user_id: user.id,
        p_organization_id: organization?.id || null
      });

    if (!error && context) {
      isSuperAdmin = context.is_super_admin || false;
      isOrgAdmin = context.is_org_admin || false;
      roleName = context.role_name || undefined;
      departmentName = context.department_name || undefined;
      position = context.position || undefined;
      userAvatarUrl = context.avatar_url || undefined;
      userCreatedAt = context.created_at || undefined;
    }
    
    // Получаем allowed_modes из роли пользователя (если не супер-админ и не орг-админ)
    if (!isSuperAdmin && !isOrgAdmin) {
      const { data: memberWithRole } = await adminSupabase
        .from('company_members')
        .select('role_id, roles(allowed_modes, permissions)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (memberWithRole?.roles) {
        const role = memberWithRole.roles as { allowed_modes?: string[] | null; permissions?: string[] };
        // Собираем режимы из allowed_modes роли
        if (role.allowed_modes && role.allowed_modes.length > 0) {
          userAllowedModes = role.allowed_modes;
        } else if (role.permissions) {
          // Извлекаем режимы из permissions (формат "mode:action")
          const modesFromPermissions = [...new Set(
            role.permissions
              .map(p => p.split(':')[0])
              .filter(m => ['finance', 'tenders', 'ai-studio', 'personal', 'investments'].includes(m))
          )];
          if (modesFromPermissions.length > 0) {
            userAllowedModes = modesFromPermissions;
          }
        }
      }
    }
  } catch (e) {
    logger.error('Error fetching user context in layout', { error: e });
  }

  return (
    <>
      <OnlineStatusTracker />
      <OfflineIndicator />
      <PlatformHeader
        user={{
          email: user.email,
          full_name: user.user_metadata?.full_name,
          avatar_url: userAvatarUrl,
          phone: userPhone,
          created_at: userCreatedAt || user.created_at,
        }}
        organization={organization ? { name: organization.name, allowed_modes: organization.allowed_modes } : undefined}
        userAllowedModes={userAllowedModes}
        globalEnabledModes={globalEnabledModes}
        notificationCount={0}
        impersonating={null}
        isSuperAdmin={isSuperAdmin}
        isOrgAdmin={isOrgAdmin}
        roleName={roleName}
        departmentName={departmentName}
        position={position}
      />
      <ProtectedShell activeOrganization={activeOrgInfo}>
        {children}
      </ProtectedShell>
    </>
  );
}