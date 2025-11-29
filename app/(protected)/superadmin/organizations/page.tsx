import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSubscriptions } from '@/lib/billing/subscription-service';
import styles from '../superadmin.module.css';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const supabase = createAdminClient();

  // Получаем все организации
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  // Получаем подписки для связи с организациями
  const subscriptions = await getSubscriptions();
  const subsByOrg = new Map(subscriptions.map(s => [s.organization_id, s]));

  // Считаем пользователей по организациям
  const { data: memberCounts } = await supabase
    .from('company_members')
    .select('company_id, companies!inner(organization_id)')
    .eq('status', 'active');

  const usersByOrg: Record<string, number> = {};
  memberCounts?.forEach((m: { companies: { organization_id: string } | { organization_id: string }[] }) => {
    const companies = m.companies;
    const orgId = Array.isArray(companies) ? companies[0]?.organization_id : companies?.organization_id;
    if (orgId) {
      usersByOrg[orgId] = (usersByOrg[orgId] || 0) + 1;
    }
  });

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Все организации</h1>
        <p className={styles.pageDescription}>
          Список всех зарегистрированных организаций на платформе
        </p>
      </header>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Организации ({organizations?.length || 0})</h3>
        </div>

        {organizations && organizations.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Организация</th>
                <th>Пользователей</th>
                <th>Подписка</th>
                <th>Статус</th>
                <th>Создана</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => {
                const sub = subsByOrg.get(org.id);
                const usersCount = usersByOrg[org.id] || 0;

                return (
                  <tr key={org.id}>
                    <td>
                      <div className={styles.orgCell}>
                        <div className={styles.orgAvatar}>
                          {org.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className={styles.orgInfo}>
                          <span className={styles.orgName}>{org.name}</span>
                          <span className={styles.orgMeta}>
                            {org.slug || org.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{usersCount}</strong>
                    </td>
                    <td>
                      {sub ? (
                        <>
                          <strong>{sub.plan?.name}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {sub.billing_period === 'yearly' ? 'Годовая' : 'Месячная'}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Нет</span>
                      )}
                    </td>
                    <td>
                      {sub ? (
                        <span className={`${styles.statusBadge} ${
                          sub.status === 'active' ? styles.active :
                          sub.status === 'trial' ? styles.trial :
                          sub.status === 'expired' ? styles.expired :
                          styles.cancelled
                        }`}>
                          {sub.status === 'active' ? 'Активна' :
                           sub.status === 'trial' ? 'Пробный' :
                           sub.status === 'expired' ? 'Истекла' :
                           sub.status === 'cancelled' ? 'Отменена' : 'Просрочена'}
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.cancelled}`}>
                          Без подписки
                        </span>
                      )}
                    </td>
                    <td>{formatDate(org.created_at)}</td>
                    <td>
                      <Link 
                        href={`/superadmin/organizations/${org.id}`}
                        className={`${styles.button} ${styles.secondary}`}
                        style={{ padding: '6px 12px' }}
                      >
                        <span className="material-icons" style={{ fontSize: '16px' }}>visibility</span>
                        Детали
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <span className="material-icons">business</span>
            <h3>Нет организаций</h3>
          </div>
        )}
      </div>
    </div>
  );
}
