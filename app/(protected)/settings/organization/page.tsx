import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/platform/organization";
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

  if (!organization) {
    return (
      <div style={{ padding: "24px" }}>
        <h1>Организация не найдена</h1>
        <p>Вы не являетесь членом организации.</p>
      </div>
    );
  }

  // Получаем участников организации (используем admin client для обхода RLS)
  const { data: membersData } = await adminSupabase
    .from("organization_members")
    .select(`
      id,
      role,
      created_at,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("organization_id", organization.id);

  // Получаем профиль текущего пользователя
  const { data: currentUserProfile } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  // Преобразуем данные участников в нужный формат
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = (membersData || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    created_at: m.created_at,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
  }));

  // Если нет участников в organization_members, показываем текущего пользователя как владельца
  if (members.length === 0 && currentUserProfile) {
    members = [{
      id: 'current-user',
      role: 'owner',
      created_at: organization.created_at,
      profiles: currentUserProfile
    }];
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

  // Проверяем роль текущего пользователя (используем admin client)
  const { data: currentMember } = await adminSupabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .single();

  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";

  return (
    <OrganizationSettings 
      organization={organization}
      members={members || []}
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
