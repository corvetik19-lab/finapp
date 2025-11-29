import { getSubscriptionPlans } from '@/lib/billing/subscription-service';
import { PricingManager } from '@/components/superadmin/PricingManager';
import styles from '../superadmin.module.css';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const plans = await getSubscriptionPlans(false); // Получаем все планы, включая неактивные

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ценообразование</h1>
        <p className={styles.pageDescription}>
          Управление ценами на тарифы. Все цены задаются вручную.
        </p>
      </header>

      <PricingManager plans={plans} />
    </div>
  );
}
