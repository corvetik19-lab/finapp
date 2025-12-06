import { getSubscriptionPlans } from '@/lib/billing/subscription-service';
import { PlansManager } from '@/components/superadmin/PlansManager';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await getSubscriptionPlans(false); // включая неактивные

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Тарифные планы</h1>
        <p className="text-gray-500 mt-1">Управление тарифами подписок для организаций</p>
      </header>

      <PlansManager plans={plans} />

      {/* Информация о ценообразовании */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Как работает ценообразование</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Базовая цена</div>
              <div className="text-sm font-medium">Фиксированная стоимость тарифа</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Включено пользователей</div>
              <div className="text-sm font-medium">Входят в базовую стоимость</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Доп. пользователи</div>
              <div className="text-sm font-medium">Оплачиваются отдельно</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Формула</div>
              <div className="text-sm font-medium font-mono">База + (Польз. − Включено) × Цена</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
