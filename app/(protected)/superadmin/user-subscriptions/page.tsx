import { getUserSubscriptions, getUserSubscriptionPlans, getUserBillingStats } from '@/lib/billing/user-subscription-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { UserSubscriptionsTable } from './UserSubscriptionsTable';
import { AddUserSubscriptionModal } from './AddUserSubscriptionModal';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

export const dynamic = 'force-dynamic';

export default async function UserSubscriptionsPage() {
  const [subscriptions, plans, stats] = await Promise.all([
    getUserSubscriptions(),
    getUserSubscriptionPlans(true, 'finance'),
    getUserBillingStats(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Подписки пользователей</h1>
          <p className="text-gray-500 text-sm">Управление индивидуальными подписками на режим Финансы</p>
        </div>
        <AddUserSubscriptionModal plans={plans} />
      </header>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80 font-medium">MRR</span>
              <TrendingUp className="h-5 w-5 text-white/80" />
            </div>
            <div className="text-2xl font-bold">{formatMoney(stats.mrr)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700 font-medium">Активные</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.active_subscriptions}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-700 font-medium">Пробные</span>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700">{stats.trial_subscriptions}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-700 font-medium">Истекшие</span>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700">{stats.expired_subscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Всего</span>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_users_with_subscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Распределение по планам */}
      {stats.plans_distribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Распределение по тарифам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats.plans_distribution.map((plan) => (
                <div key={plan.plan_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{plan.plan_name}</div>
                    <div className="text-sm text-gray-500">{plan.count} подписок ({plan.percentage}%)</div>
                  </div>
                  <Badge variant="secondary">{formatMoney(plan.revenue)}/мес</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Таблица подписок */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Все подписки</CardTitle>
        </CardHeader>
        <CardContent>
          <UserSubscriptionsTable subscriptions={subscriptions} plans={plans} />
        </CardContent>
      </Card>
    </div>
  );
}
