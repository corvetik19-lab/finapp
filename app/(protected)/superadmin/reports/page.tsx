import { getBillingStats, getAllPayments } from '@/lib/billing/subscription-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Landmark, PiggyBank, Receipt, Download, BarChart3 } from 'lucide-react';
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Финансовые отчёты</h1>
        <p className="text-gray-500 mt-1">Аналитика и отчёты по доходам платформы</p>
      </header>

      {/* Ключевые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/80 font-medium">MRR (Monthly)</span>
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{formatMoney(stats.mrr)}</div>
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
              <span className="text-sm text-gray-500 font-medium">ARR (Annual)</span>
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
              <span className="text-sm text-gray-500 font-medium">Всего выручка</span>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.total_revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Средний чек</span>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(stats.avg_revenue_per_org)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Динамика по месяцам */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Выручка по месяцам</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </CardHeader>
        <CardContent>
          {sortedMonths.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Месяц</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Выручка</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-[40%]">Визуализация</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonths.map(([month, amount]) => {
                    const maxAmount = Math.max(...sortedMonths.map(([, a]) => a));
                    const percentage = (amount / maxAmount) * 100;
                    
                    return (
                      <tr key={month} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 capitalize">{formatMonth(month)}</td>
                        <td className="py-3 px-4">
                          <span className="text-lg font-bold tabular-nums">{formatMoney(amount)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет данных</h3>
              <p className="text-gray-400">Данные появятся после первых платежей</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Распределение по тарифам */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Распределение по тарифам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Тариф</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Подписок</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Доля</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">MRR</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-[30%]">Визуализация</th>
                </tr>
              </thead>
              <tbody>
                {stats.plans_distribution.map((plan) => {
                  const maxRevenue = Math.max(...stats.plans_distribution.map(p => p.revenue));
                  const revenuePercent = maxRevenue > 0 ? (plan.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <tr key={plan.plan_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{plan.plan_name}</td>
                      <td className="py-3 px-4">{plan.count}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{plan.percentage}%</Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold tabular-nums">{formatMoney(plan.revenue)}</td>
                      <td className="py-3 px-4">
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${revenuePercent}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ключевые метрики */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Ключевые метрики</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Активных подписок</div>
              <div className="text-xl font-bold">{stats.active_subscriptions}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">На пробном периоде</div>
              <div className="text-xl font-bold">{stats.trial_subscriptions}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Платящих пользователей</div>
              <div className="text-xl font-bold">{stats.paying_users}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Бесплатных пользователей</div>
              <div className="text-xl font-bold">{stats.free_users}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Средн. польз. на орг.</div>
              <div className="text-xl font-bold">{stats.avg_users_per_org}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Выручка за месяц</div>
              <div className="text-xl font-bold">{formatMoney(stats.revenue_this_month)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
