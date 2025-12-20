import { redirect } from "next/navigation";
import { createRSCClient, createAdminClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization, getCurrentCompanyId } from "@/lib/platform/organization";
import OrganizationSettings from "@/components/settings/OrganizationSettings";

export default async function OrganizationSettingsPage() {
  const supabase = await createRSCClient();
  const adminSupabase = createAdminClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const companyId = await getCurrentCompanyId();

  if (!organization) {
    return (
      <div style={{ padding: "24px" }}>
        <h1>Организация не найдена</h1>
        <p>Вы не являетесь членом организации.</p>
      </div>
    );
  }

  // Получаем участников через company_members
  let members: Array<{
    id: string;
    role: string;
    created_at: string;
    profiles: {
      id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
  }> = [];

  if (companyId) {
    // Получаем членов компании
    const { data: membersData } = await adminSupabase
      .from('company_members')
      .select('id, user_id, role, created_at')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (membersData && membersData.length > 0) {
      // Получаем профили с global_role для фильтрации супер-админов
      const userIds = membersData.map(m => m.user_id).filter(Boolean);
      const { data: profilesData } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, global_role')
        .in('id', userIds);

      // Получаем роли пользователей из user_roles
      const { data: userRolesData } = await adminSupabase
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Создаём Map для ролей пользователей
      const userRolesMap = new Map<string, string>();
      (userRolesData || []).forEach((ur) => {
        const roles = ur.roles as { name?: string } | { name?: string }[] | null;
        const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name;
        if (roleName) {
          userRolesMap.set(ur.user_id, roleName);
        }
      });

      // Фильтруем: исключаем супер-админов и пользователей без email
      members = membersData
        .map(m => {
          const profile = m.user_id ? profilesMap.get(m.user_id) : null;
          // Используем роль из user_roles, если есть, иначе company_members.role
          const userRole = m.user_id ? userRolesMap.get(m.user_id) : null;
          return {
            id: m.id,
            role: userRole || m.role, // Приоритет у роли из user_roles
            created_at: m.created_at,
            profiles: profile ? {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url
            } : null,
            global_role: profile?.global_role
          };
        })
        .filter(m => {
          // Исключаем супер-админов
          if (m.global_role === 'super_admin') return false;
          // Исключаем пользователей без email (пустые профили)
          if (!m.profiles?.email) return false;
          return true;
        })
        .map(({ global_role: _, ...rest }) => { void _; return rest; }); // Убираем global_role из финального объекта
    }
  }

  // Получаем статистику
  const { count: transactionsCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const { count: accountsCount } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const { count: categoriesCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  // Проверяем роль текущего пользователя
  const currentMember = members.find(m => m.profiles?.id === user.id);
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";

  return (
    <OrganizationSettings 
      organization={organization}
      members={members}
      stats={{
        transactions: transactionsCount || 0,
        accounts: accountsCount || 0,
        categories: categoriesCount || 0,
      }}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}
