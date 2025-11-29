import Link from 'next/link';
import { getSubscriptions, getSubscriptionPlans, getBillingStats } from '@/lib/billing/subscription-service';
import type { SubscriptionStatus } from '@/types/billing';
import { BillingActions } from '@/components/superadmin/BillingActions';
import styles from '../superadmin.module.css';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadgeClass(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return styles.active;
    case 'trial': return styles.trial;
    case 'expired': return styles.expired;
    case 'cancelled': return styles.cancelled;
    case 'past_due': return styles.pastDue;
    default: return '';
  }
}

function getStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return 'Активна';
    case 'trial': return 'Пробный';
    case 'expired': return 'Истекла';
    case 'cancelled': return 'Отменена';
    case 'past_due': return 'Просрочена';
    default: return status;
  }
}

function getDaysProgressClass(days: number): string {
  if (days > 14) return styles.good;
  if (days > 7) return styles.warning;
  return styles.danger;
}

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const [subscriptions, plans, stats] = await Promise.all([
    getSubscriptions(),
    getSubscriptionPlans(),
    getBillingStats(),
  ]);

  // Группируем подписки по статусу для фильтров
  const expiringCount = subscriptions.filter(s => s.is_expiring_soon).length;

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Биллинг и подписки</h1>
        <p className={styles.pageDescription}>
          Управление подписками организаций, платежами и тарифами
        </p>
      </header>

      {/* Краткая статистика */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.highlight}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>MRR</span>
            <div className={styles.statIcon}>
              <span className="material-icons">trending_up</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.mrr)}</div>
        </div>

        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Активные</span>
            <div className={styles.statIcon}>
              <span className="material-icons">check_circle</span>
            </div>
          </div>
          <div className={styles.statValue}>{stats.active_subscriptions}</div>
        </div>

        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Скоро истекают</span>
            <div className={styles.statIcon}>
              <span className="material-icons">warning</span>
            </div>
          </div>
          <div className={styles.statValue}>{expiringCount}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего подписок</span>
            <div className={styles.statIcon}>
              <span className="material-icons">inventory</span>
            </div>
          </div>
          <div className={styles.statValue}>{subscriptions.length}</div>
        </div>
      </div>

      {/* Таблица подписок */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Все подписки организаций</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/superadmin/plans" className={`${styles.button} ${styles.secondary}`}>
              <span className="material-icons">tune</span>
              Тарифы
            </Link>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-icons">inbox</span>
            <h3>Нет подписок</h3>
            <p>Подписки появятся когда организации выберут тариф</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Организация</th>
                <th>Тариф</th>
                <th>Статус</th>
                <th>Пользователей</th>
                <th>Сумма/мес</th>
                <th>До окончания</th>
                <th>Оплачено всего</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const daysPercent = Math.min(100, Math.max(0, (sub.days_until_expiry / 30) * 100));
                
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className={styles.orgCell}>
                        <div className={styles.orgAvatar}>
                          {sub.organization?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className={styles.orgInfo}>
                          <span className={styles.orgName}>{sub.organization?.name || 'Без названия'}</span>
                          <span className={styles.orgMeta}>
                            ID: {sub.organization_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{sub.plan?.name || '—'}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {sub.billing_period === 'yearly' ? 'Годовая' : 'Месячная'}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(sub.status)}`}>
                        {getStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{sub.users_count}</strong>
                      {sub.plan && sub.users_count > sub.plan.users_included && (
                        <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                          +{sub.users_count - sub.plan.users_included} доп.
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={styles.amount}>
                        {formatMoney(sub.billing_period === 'yearly' ? Math.round(sub.total_amount / 12) : sub.total_amount)}
                      </span>
                      {sub.discount_percent > 0 && (
                        <div style={{ fontSize: '12px', color: '#10b981' }}>
                          -{sub.discount_percent}% скидка
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.daysProgress}>
                        <div className={styles.progressBar}>
                          <div 
                            className={`${styles.progressFill} ${getDaysProgressClass(sub.days_until_expiry)}`}
                            style={{ width: `${daysPercent}%` }}
                          />
                        </div>
                        <span className={styles.daysText}>
                          {sub.days_until_expiry > 0 
                            ? `${sub.days_until_expiry} дн.`
                            : 'Истекла'
                          }
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        до {formatDate(sub.current_period_end)}
                      </div>
                    </td>
                    <td>
                      <span className={styles.amount}>{formatMoney(sub.total_paid)}</span>
                    </td>
                    <td>
                      <BillingActions subscription={sub} plans={plans} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Доступные тарифы */}
      <div className={styles.tableContainer} style={{ marginTop: '24px' }}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Тарифные планы</h3>
          <Link href="/superadmin/plans" className={`${styles.button} ${styles.primary}`}>
            <span className="material-icons">add</span>
            Создать тариф
          </Link>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Базовая цена</th>
              <th>За пользователя</th>
              <th>Включено польз.</th>
              <th>Макс. польз.</th>
              <th>Режимы</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <strong>{plan.name}</strong>
                  {plan.is_default && (
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '10px', 
                      background: '#dbeafe', 
                      color: '#1e40af',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      По умолчанию
                    </span>
                  )}
                </td>
                <td>
                  {formatMoney(plan.base_price_monthly)}/мес
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {formatMoney(plan.base_price_yearly)}/год
                  </div>
                </td>
                <td>
                  {plan.price_per_user_monthly > 0 ? (
                    <>
                      {formatMoney(plan.price_per_user_monthly)}/мес
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {formatMoney(plan.price_per_user_yearly)}/год
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{plan.users_included}</td>
                <td>{plan.max_users || '∞'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {plan.allowed_modes.map((mode) => (
                      <span 
                        key={mode}
                        style={{
                          fontSize: '11px',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${plan.is_active ? styles.active : styles.cancelled}`}>
                    {plan.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
