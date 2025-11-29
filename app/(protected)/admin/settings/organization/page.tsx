import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/platform/organization";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import { getOrganizations } from '@/lib/admin/organizations';
import { getAllAuthUsers } from '@/lib/admin/users';
import { OrganizationsList } from '@/components/admin/organizations-list';
import { CreateOrganizationModal } from '@/components/admin/create-organization-modal';
import styles from './AdminOrganizations.module.css';

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
    
    const { data: memberships } = await supabase
        .from('company_members')
        .select('company:companies(organization_id)')
        .eq('user_id', user.id);

    type MembershipWithCompany = {
        company: { organization_id: string } | null;
    };

    const memberOrgIds = (memberships as unknown as MembershipWithCompany[])
        ?.map((m) => m.company?.organization_id)
        .filter((id): id is string => typeof id === 'string') || [];

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
      <div className={styles.container}>
          {/* Заголовок и действия */}
          <div className={styles.header}>
              <div>
                  <h1 className={styles.title}>Организации</h1>
                  <p className={styles.subtitle}>Управление клиентами и их доступом к модулям</p>
              </div>
              <CreateOrganizationModal users={users} />
          </div>

          {/* Карточки статистики */}
          <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                  <div className={styles.statLabel}>Всего организаций</div>
                  <div className={styles.statValue}>{total}</div>
              </div>
              <div className={styles.statCard}>
                  <div className={styles.statLabel}>Активные</div>
                  <div className={`${styles.statValue} ${styles.success}`}>{active}</div>
              </div>
              <div className={styles.statCard}>
                  <div className={styles.statLabel}>Остановленные</div>
                  <div className={`${styles.statValue} ${styles.warning}`}>{suspended}</div>
              </div>
          </div>

          {/* Список */}
          <div className={styles.listContainer}>
              <OrganizationsList
                  organizations={organizations}
                  isSuperAdmin={true}
                  memberOrgIds={memberOrgIds}
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

  return <OrganizationSettings organization={organization} />;
}
