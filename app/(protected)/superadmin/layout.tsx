import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedUser, createRSCClient } from '@/lib/supabase/server';
import styles from './superadmin.module.css';

const NAV_ITEMS = [
  { href: '/superadmin', icon: 'dashboard', label: 'Обзор' },
  { href: '/superadmin/billing', icon: 'payments', label: 'Биллинг' },
  { href: '/superadmin/organizations', icon: 'business', label: 'Организации' },
  { href: '/superadmin/users', icon: 'people', label: 'Пользователи' },
  { href: '/superadmin/plans', icon: 'inventory_2', label: 'Тарифы' },
  { href: '/superadmin/pricing', icon: 'sell', label: 'Ценообразование' },
  { href: '/superadmin/payments', icon: 'receipt_long', label: 'Платежи' },
  { href: '/superadmin/reports', icon: 'analytics', label: 'Отчёты' },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect('/auth/login');
  }

  const supabase = await createRSCClient();

  // Проверяем что пользователь - супер-админ
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.global_role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className={styles.layout}>
      {/* Боковая панель */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className="material-icons" style={{ color: '#667eea' }}>admin_panel_settings</span>
          <span className={styles.sidebarTitle}>Super Admin</span>
        </div>
        
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navItem}
            >
              <span className="material-icons">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className="material-icons">person</span>
            <div>
              <div className={styles.userName}>{profile?.full_name || user.email}</div>
              <div className={styles.userRole}>Супер-администратор</div>
            </div>
          </div>
          <Link href="/tenders/dashboard" className={styles.backLink}>
            <span className="material-icons">arrow_back</span>
            <span>Вернуться к тендерам</span>
          </Link>
        </div>
      </aside>

      {/* Основной контент */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
