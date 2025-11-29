import { createAdminClient } from '@/lib/supabase/admin';
import styles from '../superadmin.module.css';

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = createAdminClient();

  // Получаем всех пользователей
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  // Получаем профили
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  // Получаем членство в компаниях
  const { data: memberships } = await supabase
    .from('company_members')
    .select(`
      user_id,
      role,
      status,
      company:companies(name, organization:organizations(name))
    `)
    .eq('status', 'active');

  // Группируем членства по пользователям
  const membershipsByUser: Record<string, Array<{
    role: string;
    company: string;
    organization: string;
  }>> = {};
  
  memberships?.forEach((m) => {
    if (!membershipsByUser[m.user_id]) {
      membershipsByUser[m.user_id] = [];
    }
    const company = m.company as { name?: string; organization?: { name?: string } };
    membershipsByUser[m.user_id].push({
      role: m.role,
      company: company?.name || '',
      organization: company?.organization?.name || '',
    });
  });

  // Объединяем данные
  const users = (authUsers || []).map(user => {
    const profile = profiles?.find(p => p.id === user.id);
    const userMemberships = membershipsByUser[user.id] || [];
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      global_role: profile?.global_role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      memberships: userMemberships,
    };
  });

  // Статистика
  const superAdmins = users.filter(u => u.global_role === 'super_admin').length;
  const admins = users.filter(u => u.global_role === 'admin').length;
  const regularUsers = users.filter(u => u.global_role === 'user').length;

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Все пользователи</h1>
        <p className={styles.pageDescription}>
          Список всех зарегистрированных пользователей на платформе
        </p>
      </header>

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего пользователей</span>
            <div className={styles.statIcon}>
              <span className="material-icons">group</span>
            </div>
          </div>
          <div className={styles.statValue}>{users.length}</div>
        </div>

        <div className={`${styles.statCard} ${styles.highlight}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Супер-админы</span>
            <div className={styles.statIcon}>
              <span className="material-icons">admin_panel_settings</span>
            </div>
          </div>
          <div className={styles.statValue}>{superAdmins}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Админы</span>
            <div className={styles.statIcon}>
              <span className="material-icons">manage_accounts</span>
            </div>
          </div>
          <div className={styles.statValue}>{admins}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Пользователи</span>
            <div className={styles.statIcon}>
              <span className="material-icons">person</span>
            </div>
          </div>
          <div className={styles.statValue}>{regularUsers}</div>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Пользователи ({users.length})</h3>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Глобальная роль</th>
              <th>Организации</th>
              <th>Регистрация</th>
              <th>Последний вход</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className={styles.orgCell}>
                    <div className={styles.orgAvatar} style={{ 
                      width: '36px', 
                      height: '36px', 
                      fontSize: '14px',
                      background: user.global_role === 'super_admin' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : user.global_role === 'admin'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                    }}>
                      {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span>{user.full_name || 'Без имени'}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`${styles.statusBadge} ${
                    user.global_role === 'super_admin' ? styles.active :
                    user.global_role === 'admin' ? styles.trial : ''
                  }`} style={{
                    background: user.global_role === 'super_admin' ? '#f3e8ff' : undefined,
                    color: user.global_role === 'super_admin' ? '#7c3aed' : undefined,
                  }}>
                    {user.global_role === 'super_admin' ? 'Супер-админ' :
                     user.global_role === 'admin' ? 'Админ' : 'Пользователь'}
                  </span>
                </td>
                <td>
                  {user.memberships.length > 0 ? (
                    <div style={{ fontSize: '13px' }}>
                      {user.memberships.slice(0, 2).map((m, i) => (
                        <div key={i} style={{ marginBottom: '2px' }}>
                          <strong>{m.organization}</strong>
                          <span style={{ color: '#64748b' }}> ({m.role})</span>
                        </div>
                      ))}
                      {user.memberships.length > 2 && (
                        <div style={{ color: '#94a3b8' }}>
                          +{user.memberships.length - 2} ещё
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
                <td>{formatDateTime(user.created_at)}</td>
                <td>
                  {user.last_sign_in_at 
                    ? formatDateTime(user.last_sign_in_at) 
                    : <span style={{ color: '#94a3b8' }}>Никогда</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
