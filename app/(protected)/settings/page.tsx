import { createRSCClient } from "@/lib/supabase/helpers";
import SettingsShell from "@/components/settings/SettingsShell";
import type { CategoryRecord } from "@/components/settings/CategoriesManager";
import type { PlanPresetRecord, PlanTypeRecord } from "@/components/settings/PlanSettingsManager";
import type { RoleRecord } from "@/components/settings/RolesManager";
import type { UserRecord, RoleOption } from "@/components/settings/UsersManager";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createRSCClient();
  
  // Получаем данные пользователя
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cats = [] } = await supabase
    .from("categories")
    .select("id,name,kind,parent_id")
    .order("name", { ascending: true });

  const { data: planTypesData = [] } = await supabase
    .from("plan_types")
    .select("id,name,icon,color,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: planPresetsData = [] } = await supabase
    .from("plan_presets")
    .select(
      "id,name,plan_type_id,goal_amount,monthly_contribution,priority,note,icon,sort_order,created_at"
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

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

  const categories = (cats || []) as CategoryRecord[];
  const planTypes = (planTypesData || []) as PlanTypeRecord[];
  const planPresets = (planPresetsData || []) as PlanPresetRecord[];
  const roles = (rolesData || []) as RoleRecord[];

  // Формируем список пользователей с ролями
  const users: UserRecord[] = usersData.map(u => {
    const userRole = userRolesData?.find(ur => ur.user_id === u.id);
    // Первый созданный пользователь считается администратором
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
      is_admin: isAdmin,
    };
  });

  // Формируем опции ролей для селектов
  const roleOptions: RoleOption[] = roles.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
  }));

  // Формируем данные профиля
  const profile = {
    email: user?.email || "",
    fullName: user?.user_metadata?.full_name || "",
    phone: user?.user_metadata?.phone || "",
    avatar: user?.user_metadata?.avatar_url || null,
    createdAt: user?.created_at || new Date().toISOString(),
  };

  return (
    <SettingsShell
      profile={profile}
      categories={categories}
      planTypes={planTypes}
      planPresets={planPresets}
      users={users}
      roles={roles}
      roleOptions={roleOptions}
    />
  );
}
