import Link from 'next/link';
import { getBillingStats } from '@/lib/billing/subscription-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  CreditCard,
  PiggyBank,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Users,
  Wallet,
  UserCheck,
  BarChart3,
  Settings,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Панель супер-администратора</h1>
        <p className="text-gray-500 text-sm">Общая статистика и ключевые показатели платформы</p>
      </header>

      {/* Основные метрики - Доходы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR - выделенная карточка */}
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/80 font-medium">MRR (Ежемесячный доход)</span>
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold">{formatMoney(stats.mrr)}</div>
            {stats.revenue_growth_percent !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-2",
                stats.revenue_growth_percent > 0 ? "text-green-200" : "text-red-200"
              )}>
                {stats.revenue_growth_percent > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(stats.revenue_growth_percent)}% vs прошлый месяц
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">ARR (Годовой доход)</span>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.arr)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Выручка за месяц</span>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.revenue_this_month)}</div>
            <div className="text-xs text-gray-400 mt-1">Прошлый: {formatMoney(stats.revenue_last_month)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего выручка</span>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.total_revenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Подписки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-green-700 font-medium">Активные подписки</span>
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
              <span className="text-sm text-amber-700 font-medium">Пробный период</span>
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-700">{stats.trial_subscriptions}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-red-700 font-medium">Истекшие</span>
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-700">{stats.expired_subscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего организаций</span>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_organizations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Пользователи */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего пользователей</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Платящие пользователи</span>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.paying_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Бесплатные пользователи</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.free_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Средний доход на орг.</span>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.avg_revenue_per_org)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Распределение по планам */}
      {stats.plans_distribution.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Распределение по тарифам</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/superadmin/plans">
                <Settings className="h-4 w-4 mr-2" />
                Управление тарифами
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тариф</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Подписок</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Доля</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Выручка (месяц)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.plans_distribution.map((plan) => (
                    <tr key={plan.plan_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{plan.plan_name}</td>
                      <td className="py-3 px-4 text-gray-600">{plan.count}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{plan.percentage}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 tabular-nums">
                        {formatMoney(plan.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Быстрые действия */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/superadmin/billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Управление биллингом
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/superadmin/organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Все организации
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/superadmin/payments">
            <Receipt className="h-4 w-4 mr-2" />
            История платежей
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/superadmin/settings">
            <Settings className="h-4 w-4 mr-2" />
            Глобальные настройки
          </Link>
        </Button>
      </div>
    </div>
  );
}
