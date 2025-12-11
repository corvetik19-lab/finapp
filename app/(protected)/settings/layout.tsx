import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import { SettingsLayoutWrapper } from "@/components/settings/settings-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/platform/organization";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await getCachedUser();
  
  if (!user) {
    redirect("/login");
  }

  const supabase = await createRouteClient();
  const adminSupabase = createAdminClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  // Super admin перенаправляем на admin/settings
  if (profile?.global_role === 'super_admin') {
    redirect("/admin/settings");
  }

  // Проверяем является ли пользователь админом организации или компании
  let isAdmin = false;
  
  const organization = await getCurrentOrganization();
  if (organization) {
    const { data: orgMember } = await adminSupabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (orgMember && (orgMember.role === 'admin' || orgMember.role === 'owner')) {
      isAdmin = true;
    }
  }

  // Проверяем роль в company_members
  if (!isAdmin) {
    const { data: companyMember } = await adminSupabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (companyMember && companyMember.role === 'admin') {
      isAdmin = true;
    }
  }

  // Если не админ - редирект на дашборд
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <SettingsLayoutWrapper>{children}</SettingsLayoutWrapper>;
}
