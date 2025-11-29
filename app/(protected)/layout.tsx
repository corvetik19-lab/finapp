import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProtectedShell from "@/components/layout/ProtectedShell";
import PlatformHeader from "@/components/platform/PlatformHeader";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { getCurrentOrganization, getActiveOrganizationInfo } from "@/lib/platform/organization";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const activeOrgInfo = await getActiveOrganizationInfo();

  // Получаем роль пользователя (используем admin client для обхода RLS)
  let isSuperAdmin = false;
  let isOrgAdmin = false;
  
  try {
    const adminSupabase = createAdminClient();
    
    // Проверяем глобальную роль
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      isSuperAdmin = profile.global_role === 'super_admin';
    }

    // Проверяем роль в текущей организации
    if (organization) {
      const { data: member } = await adminSupabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .single();

      if (member) {
        isOrgAdmin = member.role === 'admin' || member.role === 'owner';
      }
    }
  } catch (e) {
    console.error('[Layout] Error fetching profile:', e);
  }

  return (
    <>
      <OfflineIndicator />
      <PlatformHeader
        user={{
          email: user.email,
          full_name: user.user_metadata?.full_name,
        }}
        organization={organization ? { name: organization.name, allowed_modes: organization.allowed_modes } : undefined}
        notificationCount={0}
        impersonating={null}
        isSuperAdmin={isSuperAdmin}
        isOrgAdmin={isOrgAdmin}
      />
      <ProtectedShell activeOrganization={activeOrgInfo}>
        {children}
      </ProtectedShell>
    </>
  );
}