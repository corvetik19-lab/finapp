import { redirect } from "next/navigation";
import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import UsersManager from "@/components/settings/UsersManager";

export const dynamic = 'force-dynamic';

export default async function UsersSettingsPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }
  
  const supabase = await createRSCClient();

  // Получаем роли
  const { data: rolesData = [] } = await supabase
    .from("roles")
    .select("id,name,description,permissions,color,is_default,created_at")
    .order("created_at", { ascending: true });

  // Получаем всех пользователей через Admin API
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let usersData: Array<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
    created_at: string;
    last_sign_in_at?: string | null;
  }> = [];
  
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

    const { data: { users: adminUsers }, error: usersError } = await adminClient.auth.admin.listUsers();
    if (!usersError && adminUsers) {
      usersData = adminUsers as typeof usersData;
    }
  }

  // Получаем связи пользователей и ролей
  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("user_id, role_id, roles(name, color)")
    .returns<Array<{user_id: string; role_id: string; roles: {name: string; color: string} | null}>>();

  // Получаем профили для фильтрации супер-админов и last_seen_at (используем admin client)
  let profilesData: Array<{id: string; global_role: string | null; last_seen_at: string | null}> = [];
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
    const { data } = await adminClient
      .from("profiles")
      .select("id, global_role, last_seen_at");
    profilesData = data || [];
  }

  // Формируем список пользователей с ролями, исключая супер-админов
  const users = usersData
    .filter(u => {
      // Исключаем супер-админов из списка
      const profile = profilesData?.find(p => p.id === u.id);
      return profile?.global_role !== 'super_admin';
    })
    .map(u => {
      const userRole = userRolesData?.find(ur => ur.user_id === u.id);
      const profile = profilesData?.find(p => p.id === u.id);
      const isAdmin = u.id === user?.id;
      return {
        id: u.id,
        email: u.email || "",
        full_name: u.user_metadata?.full_name || null,
        role_id: userRole?.role_id || null,
        role_name: userRole?.roles?.name || null,
        role_color: userRole?.roles?.color || null,
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
