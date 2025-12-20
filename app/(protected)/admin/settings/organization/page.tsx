import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/platform/organization";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import { getOrganizations } from '@/lib/admin/organizations';
import { getAllAuthUsers } from '@/lib/admin/users';
import { OrganizationsList } from '@/components/admin/organizations-list';
import { CreateOrganizationModal } from '@/components/admin/create-organization-modal';

export default async function OrganizationSettingsPage() {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createRouteClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role, active_company_id')
    .eq('id', user.id)
    .single();

  // Если пользователь супер-админ, показываем список всех организаций для управления
  if (profile?.global_role === 'super_admin') {
    const organizations = await getOrganizations();
    const users = await getAllAuthUsers();
    
    // Получаем organization_id для активной компании
    let activeOrgId: string | null = null;
    if (profile?.active_company_id) {
      const { data: activeCompany } = await supabase
        .from('companies')
        .select('organization_id')
        .eq('id', profile.active_company_id)
        .single();
      activeOrgId = activeCompany?.organization_id || null;
    }

    // Статистика
    const total = organizations.length;
    const active = organizations.filter(o => o.is_active).length;
    const suspended = total - active;

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Заголовок и действия */}
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="text-2xl font-bold">Организации</h1>
                  <p className="text-muted-foreground">Управление клиентами и их доступом к модулям</p>
              </div>
              <CreateOrganizationModal users={users} />
          </div>

          {/* Карточки статистики */}
          <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Всего организаций</div>
                  <div className="text-2xl font-bold">{total}</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Активные</div>
                  <div className="text-2xl font-bold text-green-600">{active}</div>
              </div>
              <div className="bg-card rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Остановленные</div>
                  <div className="text-2xl font-bold text-yellow-600">{suspended}</div>
              </div>
          </div>

          {/* Список */}
          <div className="bg-card rounded-lg border">
              <OrganizationsList
                  organizations={organizations}
                  isSuperAdmin={true}
                  activeOrgId={activeOrgId}
              />
          </div>
      </div>
    );
  }

  // Если обычный пользователь/админ - показываем настройки его текущей организации
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div style={{ padding: "24px" }}>
        <h1>Организация не найдена</h1>
        <p>Вы не являетесь членом организации.</p>
      </div>
    );
  }

  // Получаем компании организации и участников
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization.id);
  
  const companyIds = companies?.map(c => c.id) || [];
  
  // Получаем участников компаний организации
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
  
  if (companyIds.length > 0) {
    // Сначала получаем членов компании
    const { data: membersData } = await supabase
      .from('company_members')
      .select('id, user_id, role, created_at')
      .in('company_id', companyIds)
      .eq('status', 'active');
    
    if (membersData && membersData.length > 0) {
      // Получаем профили отдельным запросом
      const userIds = membersData.map(m => m.user_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );
      
      members = membersData.map(m => ({
        id: m.id,
        role: m.role,
        created_at: m.created_at,
        profiles: m.user_id ? profilesMap.get(m.user_id) || null : null
      }));
    }
  }

  return <OrganizationSettings organization={organization} members={members} currentUserId={user.id} />;
}
