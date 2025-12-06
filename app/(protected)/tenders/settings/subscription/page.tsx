import { createRSCClient } from '@/lib/supabase/server';
import { getOrganizationSubscription } from '@/lib/billing/subscription-service';
import { getCurrentOrganization } from '@/lib/platform/organization';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, AlertTriangle, CheckCircle, Clock, Users, Crown, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function SubscriptionPage() {
  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-6"><h1 className="text-2xl font-bold mb-4">Подписка</h1>
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Организация не найдена</AlertDescription></Alert>
      </div>
    );
  }

  const subscription = await getOrganizationSubscription(organization.id);

  // Получаем количество сотрудников
  const supabase = await createRSCClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization.id);

  const companyIds = companies?.map(c => c.id) || [];
  
  const { count: employeesCount } = await supabase
    .from('company_members')
    .select('id', { count: 'exact', head: true })
    .in('company_id', companyIds)
    .eq('status', 'active');

  // Рассчитываем дни до окончания
  const daysUntilExpiry = subscription 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const usersIncluded = subscription?.plan?.users_included || 1;
  const maxUsers = subscription?.plan?.max_users || null;
  const currentUsers = employeesCount || 0;
  const extraUsers = Math.max(0, currentUsers - usersIncluded);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6 text-purple-600" />Подписка</h1><p className="text-muted-foreground">Информация о вашей подписке и тарифном плане</p></div>

      {!subscription ? (
        <Alert><AlertTriangle className="h-5 w-5" /><AlertTitle>Нет активной подписки</AlertTitle><AlertDescription>Обратитесь к администратору для активации</AlertDescription></Alert>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={subscription.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              <CardContent className="pt-4 text-center">
                {subscription.status === 'active' ? <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" /> : <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />}
                <div className="text-sm text-muted-foreground">Статус</div>
                <div className="text-lg font-semibold">{subscription.status === 'active' ? 'Активна' : subscription.status === 'trial' ? 'Пробный' : subscription.status === 'expired' ? 'Истекла' : 'Отменена'}</div>
              </CardContent>
            </Card>
            <Card className={daysUntilExpiry <= 7 ? 'bg-red-50 border-red-200' : daysUntilExpiry <= 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}>
              <CardContent className="pt-4 text-center">
                <Clock className={`h-8 w-8 mx-auto mb-2 ${daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 30 ? 'text-yellow-600' : 'text-blue-600'}`} />
                <div className="text-sm text-muted-foreground">До окончания</div>
                <div className="text-2xl font-bold">{daysUntilExpiry} дн.</div>
                <div className="text-xs text-muted-foreground">до {formatDate(subscription.current_period_end)}</div>
              </CardContent>
            </Card>
            <Card className={maxUsers && currentUsers >= maxUsers ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
              <CardContent className="pt-4 text-center">
                <Users className={`h-8 w-8 mx-auto mb-2 ${maxUsers && currentUsers >= maxUsers ? 'text-red-600' : 'text-green-600'}`} />
                <div className="text-sm text-muted-foreground">Сотрудников</div>
                <div className="text-2xl font-bold">{currentUsers} / {maxUsers || '∞'}</div>
                <div className="text-xs text-muted-foreground">Вкл.: {usersIncluded}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4 text-center">
                <Crown className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="text-sm text-muted-foreground">Тариф</div>
                <div className="text-lg font-semibold">{subscription.plan?.name || 'Не указан'}</div>
                <div className="text-xs text-muted-foreground">{subscription.billing_period === 'monthly' ? 'Месяц' : 'Год'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Детали подписки */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Детали подписки
              </h3>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    Базовая стоимость
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                    {formatMoney(subscription.base_amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    За доп. сотрудников ({extraUsers})
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                    {formatMoney(subscription.users_amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    Скидка
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                    {subscription.discount_percent > 0 
                      ? `${subscription.discount_percent}% (${formatMoney(subscription.discount_amount)})`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    Итого к оплате
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#667eea' }}>
                    {formatMoney(subscription.total_amount)}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    Начало периода
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {formatDate(subscription.current_period_start)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    Окончание периода
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {formatDate(subscription.current_period_end)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                    ID подписки
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {subscription.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Alert><Info className="h-4 w-4" /><AlertTitle>Нужна помощь?</AlertTitle><AlertDescription>Для изменения тарифа обратитесь к администратору.</AlertDescription></Alert>
        </>
      )}
    </div>
  );
}
