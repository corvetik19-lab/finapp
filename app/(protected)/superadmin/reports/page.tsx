import { getBillingStats, getAllPayments } from '@/lib/billing/subscription-service';
import styles from '../superadmin.module.css';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [stats, payments] = await Promise.all([
    getBillingStats(),
    getAllPayments(1000),
  ]);

  // Группируем платежи по месяцам
  const paymentsByMonth: Record<string, number> = {};
  payments
    .filter(p => p.status === 'completed' && p.payment_date)
    .forEach(p => {
      const date = new Date(p.payment_date!);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      paymentsByMonth[key] = (paymentsByMonth[key] || 0) + p.amount;
    });

  // Сортируем месяцы
  const sortedMonths = Object.entries(paymentsByMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  // Форматируем название месяца
  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Финансовые отчёты</h1>
        <p className={styles.pageDescription}>
          Аналитика и отчёты по доходам платформы
        </p>
      </header>

      {/* Ключевые показатели */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.highlight}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>MRR (Monthly)</span>
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
            <span className={styles.statLabel}>ARR (Annual)</span>
            <div className={styles.statIcon}>
              <span className="material-icons">account_balance</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.arr)}</div>
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

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Средний чек</span>
            <div className={styles.statIcon}>
              <span className="material-icons">receipt</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(stats.avg_revenue_per_org)}</div>
        </div>
      </div>

      {/* Динамика по месяцам */}
      <div className={styles.tableContainer} style={{ marginBottom: '24px' }}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Выручка по месяцам</h3>
          <button className={`${styles.button} ${styles.secondary}`}>
            <span className="material-icons">download</span>
            Экспорт
          </button>
        </div>

        {sortedMonths.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Выручка</th>
                <th>Визуализация</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonths.map(([month, amount]) => {
                const maxAmount = Math.max(...sortedMonths.map(([, a]) => a));
                const percentage = (amount / maxAmount) * 100;
                
                return (
                  <tr key={month}>
                    <td style={{ textTransform: 'capitalize' }}>{formatMonth(month)}</td>
                    <td>
                      <span className={`${styles.amount} ${styles.large}`}>
                        {formatMoney(amount)}
                      </span>
                    </td>
                    <td style={{ width: '40%' }}>
                      <div className={styles.progressBar} style={{ maxWidth: '100%', height: '24px' }}>
                        <div 
                          className={`${styles.progressFill} ${styles.good}`}
                          style={{ 
                            width: `${percentage}%`,
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <span className="material-icons">analytics</span>
            <h3>Нет данных</h3>
            <p>Данные появятся после первых платежей</p>
          </div>
        )}
      </div>

      {/* Распределение по тарифам */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Распределение по тарифам</h3>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Тариф</th>
              <th>Подписок</th>
              <th>Доля</th>
              <th>MRR</th>
              <th>Визуализация</th>
            </tr>
          </thead>
          <tbody>
            {stats.plans_distribution.map((plan) => {
              const maxRevenue = Math.max(...stats.plans_distribution.map(p => p.revenue));
              const revenuePercent = maxRevenue > 0 ? (plan.revenue / maxRevenue) * 100 : 0;
              
              return (
                <tr key={plan.plan_id}>
                  <td><strong>{plan.plan_name}</strong></td>
                  <td>{plan.count}</td>
                  <td>{plan.percentage}%</td>
                  <td>
                    <span className={styles.amount}>{formatMoney(plan.revenue)}</span>
                  </td>
                  <td style={{ width: '30%' }}>
                    <div className={styles.progressBar} style={{ maxWidth: '100%', height: '20px' }}>
                      <div 
                        className={`${styles.progressFill} ${styles.good}`}
                        style={{ 
                          width: `${revenuePercent}%`,
                          background: '#10b981'
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Метрики */}
      <div className={styles.subscriptionDetails} style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          📊 Ключевые метрики
        </h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Активных подписок</span>
            <span className={styles.detailValue}>{stats.active_subscriptions}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>На пробном периоде</span>
            <span className={styles.detailValue}>{stats.trial_subscriptions}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Платящих пользователей</span>
            <span className={styles.detailValue}>{stats.paying_users}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Бесплатных пользователей</span>
            <span className={styles.detailValue}>{stats.free_users}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Средн. польз. на орг.</span>
            <span className={styles.detailValue}>{stats.avg_users_per_org}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Выручка за месяц</span>
            <span className={styles.detailValue}>{formatMoney(stats.revenue_this_month)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
