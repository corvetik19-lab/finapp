import { getSubscriptionPlans } from '@/lib/billing/subscription-service';
import { PricingManager } from '@/components/superadmin/PricingManager';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const plans = await getSubscriptionPlans(false); // Получаем все планы, включая неактивные

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Ценообразование</h1>
        <p className="text-gray-500 mt-1">Управление ценами на тарифы. Все цены задаются вручную.</p>
      </header>

      <PricingManager plans={plans} />
    </div>
  );
}
