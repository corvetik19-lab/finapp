import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import UsersManager from "@/components/settings/UsersManager";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export const dynamic = 'force-dynamic';

export default async function UsersSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем активную компанию пользователя
  const companyId = await getCurrentCompanyId();

  // Получаем роли для этой компании
  const { data: rolesData = [] } = await supabase
    .from("roles")
    .select("id,name,description,permissions,color,is_default,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  // Получаем Service Key для Admin API
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let usersData: Array<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
    created_at: string;
    last_sign_in_at?: string | null;
  }> = [];
  
  // Получаем членов компании
  let companyMemberIds: Set<string> = new Set();
  let companyMembersRolesMap: Map<string, { role_id: string | null; roles: { name: string; color: string } | null }> = new Map();
  
  if (serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Получаем членов текущей компании с их ролями
    const { data: companyMembers } = await adminClient
      .from("company_members")
      .select(`
        user_id,
        role_id,
        roles (
          name,
          color
        )
      `)
      .eq("company_id", companyId);
    
    companyMemberIds = new Set((companyMembers || []).map(m => m.user_id));
    
    // Создаём map ролей из company_members для fallback
    companyMembersRolesMap = new Map(
      (companyMembers || []).map(m => [m.user_id, {
        role_id: m.role_id,
        roles: m.roles as unknown as { name: string; color: string } | null
      }])
    );

    const { data: { users: adminUsers }, error: usersError } = await adminClient.auth.admin.listUsers();
    if (!usersError && adminUsers) {
      usersData = adminUsers as typeof usersData;
    }
  }

  // Получаем связи пользователей и ролей для этой компании
  // Сначала пробуем получить роли для текущей компании
  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("user_id, role_id, roles(name, color)")
    .eq("company_id", companyId)
    .returns<Array<{user_id: string; role_id: string; roles: {name: string; color: string} | null}>>();

  // Также получаем роли пользователей из любых компаний (для fallback)
  const { data: allUserRolesData } = await supabase
    .from("user_roles")
    .select("user_id, role_id, roles(name, color)")
    .in("user_id", Array.from(companyMemberIds))
    .returns<Array<{user_id: string; role_id: string; roles: {name: string; color: string} | null}>>();

  // Получаем профили для last_seen_at и global_role
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, last_seen_at, global_role");

  // Получаем ID текущего пользователя для проверки super_admin
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();
  
  const isCurrentUserSuperAdmin = currentUserProfile?.global_role === 'super_admin';

  // Получаем список super_admin ID для фильтрации (скрываем их от обычных админов)
  const superAdminIds = new Set(
    (profilesData || [])
      .filter(p => p.global_role === 'super_admin')
      .map(p => p.id)
  );

  // Формируем список пользователей:
  // 1. Только члены текущей компании
  // 2. Исключаем super_admin если текущий пользователь не super_admin
  const users = usersData
    .filter(u => companyMemberIds.has(u.id)) // Только члены компании
    .filter(u => isCurrentUserSuperAdmin || !superAdminIds.has(u.id)) // Скрываем super_admin
    .map(u => {
    const userRole = userRolesData?.find(ur => ur.user_id === u.id);
    const allUserRole = allUserRolesData?.find(ur => ur.user_id === u.id); // fallback из любой компании
    const profile = profilesData?.find(p => p.id === u.id);
    const isAdmin = u.id === user?.id;
    
    // Fallback на роль из company_members или из любой компании
    const memberRole = companyMembersRolesMap?.get(u.id);
    const roleId = userRole?.role_id || allUserRole?.role_id || memberRole?.role_id || null;
    const roleName = userRole?.roles?.name || allUserRole?.roles?.name || memberRole?.roles?.name || null;
    const roleColor = userRole?.roles?.color || allUserRole?.roles?.color || memberRole?.roles?.color || null;
    
    return {
      id: u.id,
      email: u.email || "",
      full_name: u.user_metadata?.full_name || null,
      role_id: roleId,
      role_name: roleName,
      role_color: roleColor,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      last_seen_at: profile?.last_seen_at ?? null,
      is_admin: isAdmin,
    };
  });

  // Формируем опции ролей для селектов
  const roles = (rolesData || []).map(r => ({
    id: r.id,
    name: r.name,
    color: r.color || "#6366f1",
  }));

  return <UsersManager users={users} roles={roles} />;
}
