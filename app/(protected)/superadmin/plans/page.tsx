import { getSubscriptionPlans } from '@/lib/billing/subscription-service';
import { PlansManager } from '@/components/superadmin/PlansManager';
import styles from '../superadmin.module.css';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await getSubscriptionPlans(false); // включая неактивные

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Тарифные планы</h1>
        <p className={styles.pageDescription}>
          Управление тарифами подписок для организаций
        </p>
      </header>

      <PlansManager plans={plans} />

      {/* Информация о ценообразовании */}
      <div className={styles.subscriptionDetails} style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          💡 Как работает ценообразование
        </h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Базовая цена</span>
            <span className={styles.detailValue}>Фиксированная стоимость тарифа</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Включено пользователей</span>
            <span className={styles.detailValue}>Входят в базовую стоимость</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Доп. пользователи</span>
            <span className={styles.detailValue}>Оплачиваются отдельно</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Формула</span>
            <span className={styles.detailValue}>
              База + (Польз. − Включено) × Цена за польз.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
