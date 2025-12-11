import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProtectedShell from "@/components/layout/ProtectedShell";
import PlatformHeader from "@/components/platform/PlatformHeader";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { OnlineStatusTracker } from "@/components/online/OnlineStatusTracker";
import { getCurrentOrganization, getActiveOrganizationInfo } from "@/lib/platform/organization";
import { getEnabledModes } from "@/lib/platform/platform-settings";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const activeOrgInfo = await getActiveOrganizationInfo();
  const globalEnabledModes = await getEnabledModes();

  // Получаем роль пользователя (используем admin client для обхода RLS)
  let isSuperAdmin = false;
  let isOrgAdmin = false;
  let roleName: string | undefined;
  let departmentName: string | undefined;
  let position: string | undefined;
  let userPhone: string | undefined;
  let userCreatedAt: string | undefined;
  let userAvatarUrl: string | undefined;
  
  try {
    const adminSupabase = createAdminClient();
    
    // Проверяем глобальную роль и получаем данные профиля
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('global_role, phone, avatar_url, created_at')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      isSuperAdmin = profile.global_role === 'super_admin';
      userPhone = profile.phone || undefined;
      userAvatarUrl = profile.avatar_url || undefined;
      userCreatedAt = profile.created_at || undefined;
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

    // Получаем данные сотрудника и роли из company_members
    const { data: companyMember } = await adminSupabase
      .from('company_members')
      .select('role, role_id, employee_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (companyMember) {
      // Если роль admin в company_members
      if (companyMember.role === 'admin') {
        isOrgAdmin = true;
      }

      // Получаем название роли
      if (companyMember.role_id) {
        const { data: roleData } = await adminSupabase
          .from('roles')
          .select('name')
          .eq('id', companyMember.role_id)
          .single();
        
        if (roleData) {
          roleName = roleData.name;
        }
      }

      // Получаем данные сотрудника
      if (companyMember.employee_id) {
        const { data: employeeData } = await adminSupabase
          .from('employees')
          .select('full_name, position, department_id')
          .eq('id', companyMember.employee_id)
          .single();

        if (employeeData) {
          position = employeeData.position || undefined;

          // Получаем название отдела
          if (employeeData.department_id) {
            const { data: deptData } = await adminSupabase
              .from('departments')
              .select('name')
              .eq('id', employeeData.department_id)
              .single();

            if (deptData) {
              departmentName = deptData.name;
            }
          }
        }
      }
    }

    // Fallback: если нет company_members, ищем сотрудника напрямую по user_id
    if (!roleName && !position) {
      const { data: employee } = await adminSupabase
        .from('employees')
        .select('full_name, position, department_id, role_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (employee) {
        position = employee.position || undefined;

        // Получаем роль
        if (employee.role_id) {
          const { data: roleData } = await adminSupabase
            .from('roles')
            .select('name')
            .eq('id', employee.role_id)
            .single();
          
          if (roleData) {
            roleName = roleData.name;
          }
        }

        // Получаем отдел
        if (employee.department_id) {
          const { data: deptData } = await adminSupabase
            .from('departments')
            .select('name')
            .eq('id', employee.department_id)
            .single();

          if (deptData) {
            departmentName = deptData.name;
          }
        }
      }
    }
  } catch (e) {
    console.error('[Layout] Error fetching profile:', e);
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