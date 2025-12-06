import Link from 'next/link';
import { getSubscriptions, getSubscriptionPlans, getBillingStats } from '@/lib/billing/subscription-service';
import type { SubscriptionStatus } from '@/types/billing';
import { BillingActions } from '@/components/superadmin/BillingActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, CheckCircle, AlertTriangle, Package, Settings, Plus, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const STATUS_CONFIG: Record<SubscriptionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Активна' },
  trial: { variant: 'secondary', label: 'Пробный' },
  expired: { variant: 'destructive', label: 'Истекла' },
  cancelled: { variant: 'outline', label: 'Отменена' },
  past_due: { variant: 'destructive', label: 'Просрочена' },
};

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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Биллинг и подписки</h1>
        <p className="text-gray-500 mt-1">Управление подписками организаций, платежами и тарифами</p>
      </header>

      {/* Краткая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/80 font-medium">MRR</span>
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{formatMoney(stats.mrr)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-green-700 font-medium">Активные</span>
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-700">{stats.active_subscriptions}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-amber-700 font-medium">Скоро истекают</span>
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-700">{expiringCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего подписок</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{subscriptions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица подписок */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Все подписки организаций</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/superadmin/plans">
              <Settings className="h-4 w-4 mr-2" />
              Тарифы
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет подписок</h3>
              <p className="text-gray-400">Подписки появятся когда организации выберут тариф</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Организация</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Тариф</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Пользователей</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Сумма/мес</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">До окончания</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Оплачено</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const daysPercent = Math.min(100, Math.max(0, (sub.days_until_expiry / 30) * 100));
                    const statusConf = STATUS_CONFIG[sub.status] || STATUS_CONFIG.cancelled;
                    
                    return (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {sub.organization?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{sub.organization?.name || 'Без названия'}</div>
                              <div className="text-xs text-gray-500">ID: {sub.organization_id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{sub.plan?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{sub.billing_period === 'yearly' ? 'Годовая' : 'Месячная'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold">{sub.users_count}</span>
                          {sub.plan && sub.users_count > sub.plan.users_included && (
                            <div className="text-xs text-amber-600">+{sub.users_count - sub.plan.users_included} доп.</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold tabular-nums">
                            {formatMoney(sub.billing_period === 'yearly' ? Math.round(sub.total_amount / 12) : sub.total_amount)}
                          </span>
                          {sub.discount_percent > 0 && (
                            <div className="text-xs text-green-600">-{sub.discount_percent}% скидка</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={daysPercent} 
                              className={cn("w-16 h-1.5", 
                                sub.days_until_expiry > 14 ? "[&>div]:bg-green-500" :
                                sub.days_until_expiry > 7 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                              )} 
                            />
                            <span className="text-xs text-gray-500">
                              {sub.days_until_expiry > 0 ? `${sub.days_until_expiry} дн.` : 'Истекла'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">до {formatDate(sub.current_period_end)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold tabular-nums">{formatMoney(sub.total_paid)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <BillingActions subscription={sub} plans={plans} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Доступные тарифы */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Тарифные планы</CardTitle>
          <Button asChild size="sm">
            <Link href="/superadmin/plans">
              <Plus className="h-4 w-4 mr-2" />
              Создать тариф
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Название</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Базовая цена</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">За пользователя</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Включено</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Макс.</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Режимы</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium">{plan.name}</span>
                      {plan.is_default && <Badge variant="secondary" className="ml-2 text-xs">По умолчанию</Badge>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatMoney(plan.base_price_monthly)}/мес</div>
                      <div className="text-xs text-gray-500">{formatMoney(plan.base_price_yearly)}/год</div>
                    </td>
                    <td className="py-3 px-4">
                      {plan.price_per_user_monthly > 0 ? (
                        <>
                          <div>{formatMoney(plan.price_per_user_monthly)}/мес</div>
                          <div className="text-xs text-gray-500">{formatMoney(plan.price_per_user_yearly)}/год</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">{plan.users_included}</td>
                    <td className="py-3 px-4">{plan.max_users || '∞'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {plan.allowed_modes.map((mode) => (
                          <Badge key={mode} variant="outline" className="text-xs">{mode}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={plan.is_active ? 'default' : 'outline'}>
                        {plan.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
