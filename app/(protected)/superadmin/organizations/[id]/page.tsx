import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  getOrganizationSubscription, 
  getOrganizationPayments,
  getSubscriptionPlans,
} from '@/lib/billing/subscription-service';
import { OrganizationActions } from '@/components/superadmin/OrganizationActions';
import type { PaymentStatus } from '@/types/billing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertTriangle, Package, Users, Clock, CreditCard, UserCircle, Receipt, Plus } from 'lucide-react';
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
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  completed: { variant: 'default', label: 'Оплачен' },
  pending: { variant: 'secondary', label: 'Ожидает' },
  processing: { variant: 'secondary', label: 'Обработка' },
  failed: { variant: 'destructive', label: 'Ошибка' },
  refunded: { variant: 'outline', label: 'Возврат' },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id: organizationId } = await params;
  
  const supabase = createAdminClient();

  // Получаем организацию
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (!organization) {
    notFound();
  }

  // Получаем компании организации
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', organizationId);

  // Получаем пользователей организации
  const companyIds = companies?.map(c => c.id) || [];
  
  // Сначала получаем членов компаний
  const { data: membersData } = await supabase
    .from('company_members')
    .select('id, user_id, role, status, created_at, company_id')
    .in('company_id', companyIds)
    .eq('status', 'active');

  // Получаем профили пользователей
  const userIds = (membersData || []).map(m => m.user_id).filter(Boolean);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, email, global_role')
    .in('id', userIds);

  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
  const companiesMap = new Map((companies || []).map(c => [c.id, c]));

  // Собираем данные и фильтруем супер-админов
  const members = (membersData || [])
    .map(m => {
      const profile = m.user_id ? profilesMap.get(m.user_id) : null;
      const company = companiesMap.get(m.company_id);
      return {
        id: m.id,
        role: m.role,
        status: m.status,
        created_at: m.created_at,
        user: profile ? { id: profile.id, full_name: profile.full_name, email: profile.email, global_role: profile.global_role } : null,
        company: company ? { name: company.name } : null,
      };
    })
    .filter(m => m.user?.global_role !== 'super_admin');

  // Получаем подписку
  const subscription = await getOrganizationSubscription(organizationId);

  // Получаем платежи
  const payments = await getOrganizationPayments(organizationId);

  // Получаем планы для переключения
  const plans = await getSubscriptionPlans();

  // Рассчитываем дни до окончания
  const daysUntilExpiry = subscription 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-4 mb-2">
          <Link href="/superadmin/billing" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
        </div>
        <p className="text-gray-500">ID: {organization.id} • Создана {formatDate(organization.created_at)}</p>
      </header>

      {/* Информация о подписке */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn(
          "hover:shadow-md transition-shadow",
          subscription?.status === 'active' 
            ? "bg-gradient-to-br from-green-50 to-white border-green-100" 
            : "bg-gradient-to-br from-amber-50 to-white border-amber-100"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={cn("text-sm font-medium",
                subscription?.status === 'active' ? "text-green-700" : "text-amber-700"
              )}>Статус подписки</span>
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                subscription?.status === 'active' ? "bg-green-500" : "bg-amber-500"
              )}>
                {subscription?.status === 'active' 
                  ? <CheckCircle className="h-5 w-5 text-white" />
                  : <AlertTriangle className="h-5 w-5 text-white" />
                }
              </div>
            </div>
            <div className={cn("text-3xl font-bold",
              subscription?.status === 'active' ? "text-green-700" : "text-amber-700"
            )}>
              {subscription ? (
                subscription.status === 'active' ? 'Активна' :
                subscription.status === 'trial' ? 'Пробный период' :
                subscription.status === 'expired' ? 'Истекла' :
                subscription.status === 'cancelled' ? 'Отменена' : 'Просрочена'
              ) : 'Нет подписки'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Тариф</span>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{subscription?.plan?.name || '—'}</div>
            {subscription && (
              <div className="text-xs text-gray-500 mt-1">
                {subscription.billing_period === 'yearly' ? 'Годовая оплата' : 'Месячная оплата'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Пользователей</span>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{members?.length || 0}</div>
            {subscription && subscription.plan && (
              <div className="text-xs text-gray-500 mt-1">
                Включено: {subscription.plan.users_included}, макс: {subscription.plan.max_users || '∞'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          "hover:shadow-md transition-shadow",
          daysUntilExpiry <= 7 && "bg-gradient-to-br from-red-50 to-white border-red-100"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={cn("text-sm font-medium",
                daysUntilExpiry <= 7 ? "text-red-700" : "text-gray-500"
              )}>До окончания</span>
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                daysUntilExpiry <= 7 ? "bg-red-500" : "bg-gray-200"
              )}>
                <Clock className={cn("h-5 w-5", daysUntilExpiry <= 7 ? "text-white" : "text-gray-600")} />
              </div>
            </div>
            <div className={cn("text-3xl font-bold",
              daysUntilExpiry <= 7 ? "text-red-700" : "text-gray-900"
            )}>
              {subscription ? (daysUntilExpiry > 0 ? `${daysUntilExpiry} дней` : 'Истекла') : '—'}
            </div>
            {subscription && (
              <div className="text-xs text-gray-500 mt-1">до {formatDate(subscription.current_period_end)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Кнопка создания подписки если её нет */}
      {!subscription && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-4">У организации нет активной подписки</h3>
            <OrganizationActions
              organizationId={organizationId}
              organizationName={organization.name}
              subscription={null}
              plans={plans}
              isBlocked={organization.is_blocked || false}
              isSuperAdminOrg={organization.name === 'Личное пространство'}
            />
          </CardContent>
        </Card>
      )}

      {/* Детали подписки */}
      {subscription && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Детали подписки</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Базовая стоимость</div>
                <div className="font-semibold">{formatMoney(subscription.base_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">За доп. пользователей</div>
                <div className="font-semibold">{formatMoney(subscription.users_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Скидка</div>
                <div className="font-semibold">
                  {subscription.discount_percent > 0 
                    ? `${subscription.discount_percent}% (${formatMoney(subscription.discount_amount)})`
                    : '—'
                  }
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Итого</div>
                <div className="text-xl font-bold text-purple-600">{formatMoney(subscription.total_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Начало периода</div>
                <div className="font-semibold">{formatDate(subscription.current_period_start)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Следующий платёж</div>
                <div className="font-semibold text-sm">
                  {subscription.next_payment_date 
                    ? `${formatMoney(subscription.next_payment_amount || 0)} — ${formatDate(subscription.next_payment_date)}`
                    : '—'
                  }
                </div>
              </div>
            </div>

            {/* Действия с подпиской */}
            <OrganizationActions
              organizationId={organizationId}
              organizationName={organization.name}
              subscription={subscription}
              plans={plans}
              isBlocked={organization.is_blocked || false}
              isSuperAdminOrg={organization.name === 'Личное пространство'}
            />
          </CardContent>
        </Card>
      )}

      {/* Пользователи организации */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Пользователи ({members?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Пользователь</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Компания</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Роль</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Добавлен</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                            {(member.user as { full_name?: string })?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{(member.user as { full_name?: string })?.full_name || 'Без имени'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{(member.company as { name?: string })?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={member.role === 'admin' || member.role === 'owner' ? 'default' : 'secondary'}>
                          {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Админ' : 'Участник'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(member.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет пользователей</h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* История платежей */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">История платежей ({payments.length})</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Добавить платёж
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Период</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Метод</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const statusConf = PAYMENT_STATUS_CONFIG[payment.status] || PAYMENT_STATUS_CONFIG.pending;
                    return (
                      <tr key={payment.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{payment.payment_date ? formatDateTime(payment.payment_date) : '—'}</td>
                        <td className="py-3 px-4 font-semibold tabular-nums">{formatMoney(payment.amount)}</td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.period_start && payment.period_end 
                            ? `${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}`
                            : '—'
                          }
                        </td>
                        <td className="py-3 px-4 text-gray-600">{payment.payment_method || '—'}</td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{payment.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет платежей</h3>
              <p className="text-gray-400">Платежи появятся после оплаты подписки</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
