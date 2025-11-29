import Link from 'next/link';
import { getBillingStats } from '@/lib/billing/subscription-service';
import styles from './superadmin.module.css';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

export const dynamic = 'force-dynamic';

export default async function SuperAdminDashboard() {
  const stats = await getBillingStats();

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Панель супер-администратора</h1>
        <p className={styles.pageDescription}>
          Общая статистика и ключевые показатели платформы
        </p>
      </header>

      {/* Основные метрики */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.highlight}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>MRR (Ежемесячный доход)</span>
            <div className={styles.statIcon}>
              <span className="material-icons">trending_up</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.mrr)}</div>
          {stats.revenue_growth_percent !== 0 && (
            <div className={`${styles.statChange} ${stats.revenue_growth_percent > 0 ? styles.positive : styles.negative}`}>
              <span className="material-icons">
                {stats.revenue_growth_percent > 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {Math.abs(stats.revenue_growth_percent)}% vs прошлый месяц
            </div>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>ARR (Годовой доход)</span>
            <div className={styles.statIcon}>
              <span className="material-icons">account_balance</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.arr)}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Выручка за месяц</span>
            <div className={styles.statIcon}>
              <span className="material-icons">payments</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.revenue_this_month)}</div>
          <div className={styles.statChange}>
            Прошлый: {formatMoney(stats.revenue_last_month)}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего выручка</span>
            <div className={styles.statIcon}>
              <span className="material-icons">savings</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.total_revenue)}</div>
        </div>
      </div>

      {/* Организации и пользователи */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Активные подписки</span>
            <div className={styles.statIcon}>
              <span className="material-icons">check_circle</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.active_subscriptions}</div>
        </div>

        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Пробный период</span>
            <div className={styles.statIcon}>
              <span className="material-icons">hourglass_empty</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.trial_subscriptions}</div>
        </div>

        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Истекшие</span>
            <div className={styles.statIcon}>
              <span className="material-icons">error_outline</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.expired_subscriptions}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего организаций</span>
            <div className={styles.statIcon}>
              <span className="material-icons">business</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.total_organizations}</div>
        </div>
      </div>

      {/* Пользователи */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего пользователей</span>
            <div className={styles.statIcon}>
              <span className="material-icons">group</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.total_users}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Платящие пользователи</span>
            <div className={styles.statIcon}>
              <span className="material-icons">paid</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.paying_users}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Бесплатные пользователи</span>
            <div className={styles.statIcon}>
              <span className="material-icons">person_outline</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.free_users}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Средний доход на орг.</span>
            <div className={styles.statIcon}>
              <span className="material-icons">analytics</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.avg_revenue_per_org)}</div>
        </div>
      </div>

      {/* Распределение по планам */}
      {stats.plans_distribution.length > 0 && (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Распределение по тарифам</h3>
            <Link href="/superadmin/plans" className={`${styles.button} ${styles.secondary}`}>
              <span className="material-icons">settings</span>
              Управление тарифами
            </Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Тариф</th>
                <th>Подписок</th>
                <th>Доля</th>
                <th>Выручка (месяц)</th>
              </tr>
            </thead>
            <tbody>
              {stats.plans_distribution.map((plan) => (
                <tr key={plan.plan_id}>
                  <td><strong>{plan.plan_name}</strong></td>
                  <td>{plan.count}</td>
                  <td>{plan.percentage}%</td>
                  <td className={styles.amount}>{formatMoney(plan.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Быстрые действия */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        <Link href="/superadmin/billing" className={`${styles.button} ${styles.primary}`}>
          <span className="material-icons">payments</span>
          Управление биллингом
        </Link>
        <Link href="/superadmin/organizations" className={`${styles.button} ${styles.secondary}`}>
          <span className="material-icons">business</span>
          Все организации
        </Link>
        <Link href="/superadmin/payments" className={`${styles.button} ${styles.secondary}`}>
          <span className="material-icons">receipt_long</span>
          История платежей
        </Link>
      </div>
    </div>
  );
}
