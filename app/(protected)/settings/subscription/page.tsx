import { createRSCClient } from '@/lib/supabase/server';
import { getOrganizationSubscription } from '@/lib/billing/subscription-service';
import { getCurrentOrganization } from '@/lib/platform/organization';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CreditCard, CheckCircle, Clock, Users, Crown, Info } from 'lucide-react';

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

export default async function SubscriptionSettingsPage() {
  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-6"><h1 className="text-2xl font-bold mb-4">Подписка</h1>
        <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Организация не найдена</AlertTitle><AlertDescription>Вы не являетесь членом организации</AlertDescription></Alert>
      </div>
    );
  }

  const subscription = await getOrganizationSubscription(organization.id);

  // Получаем количество сотрудников (исключая супер-админов)
  const supabase = await createRSCClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization.id);

  const companyIds = companies?.map(c => c.id) || [];
  
  // Получаем членов компании
  const { data: membersData } = await supabase
    .from('company_members')
    .select('user_id')
    .in('company_id', companyIds)
    .eq('status', 'active');

  // Получаем профили для проверки global_role
  const userIds = (membersData || []).map(m => m.user_id).filter(Boolean);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, global_role')
    .in('id', userIds);

  // Считаем только не-супер-админов
  const superAdminIds = new Set((profilesData || []).filter(p => p.global_role === 'super_admin').map(p => p.id));
  const employeesCount = (membersData || []).filter(m => !superAdminIds.has(m.user_id)).length;

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
      <div><h1 className="text-2xl font-bold flex items-center gap-3"><CreditCard className="h-6 w-6 text-primary" />Подписка</h1><p className="text-muted-foreground">Информация о подписке организации &laquo;{organization.name}&raquo;</p></div>

      {!subscription ? (
        <Alert><AlertTriangle className="h-5 w-5" /><AlertTitle>Нет активной подписки</AlertTitle><AlertDescription>Обратитесь к администратору для активации</AlertDescription></Alert>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={subscription.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              <CardContent className="pt-4 text-center">
                {subscription.status === 'active' ? <CheckCircle className="h-7 w-7 mx-auto mb-2 text-green-600" /> : <Clock className="h-7 w-7 mx-auto mb-2 text-yellow-600" />}
                <div className="text-xs text-muted-foreground">Статус</div>
                <div className="font-semibold">{subscription.status === 'active' ? 'Активна' : subscription.status === 'trial' ? 'Пробный' : subscription.status === 'expired' ? 'Истекла' : 'Отменена'}</div>
              </CardContent>
            </Card>
            <Card className={daysUntilExpiry <= 7 ? 'bg-red-50 border-red-200' : daysUntilExpiry <= 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}>
              <CardContent className="pt-4 text-center">
                <Clock className={`h-7 w-7 mx-auto mb-2 ${daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 30 ? 'text-yellow-600' : 'text-blue-600'}`} />
                <div className="text-xs text-muted-foreground">До окончания</div>
                <div className="text-xl font-bold">{daysUntilExpiry} дн.</div>
                <div className="text-xs text-muted-foreground">до {formatDate(subscription.current_period_end)}</div>
              </CardContent>
            </Card>
            <Card className={maxUsers && currentUsers >= maxUsers ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
              <CardContent className="pt-4 text-center">
                <Users className={`h-7 w-7 mx-auto mb-2 ${maxUsers && currentUsers >= maxUsers ? 'text-red-600' : 'text-green-600'}`} />
                <div className="text-xs text-muted-foreground">Сотрудников</div>
                <div className="text-xl font-bold">{currentUsers} / {maxUsers || '∞'}</div>
                <div className="text-xs text-muted-foreground">Вкл.: {usersIncluded}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4 text-center">
                <Crown className="h-7 w-7 mx-auto mb-2 text-purple-600" />
                <div className="text-xs text-muted-foreground">Тариф</div>
                <div className="font-semibold">{subscription.plan?.name || 'Не указан'}</div>
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
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                Детали подписки
              </h3>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Базовая стоимость
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {formatMoney(subscription.base_amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Доп. сотрудники ({extraUsers})
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {formatMoney(subscription.users_amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Скидка
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {subscription.discount_percent > 0 
                      ? `${subscription.discount_percent}%`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Итого
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#667eea' }}>
                    {formatMoney(subscription.total_amount)}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Начало периода
                  </div>
                  <div style={{ fontSize: '13px', color: '#1e293b' }}>
                    {formatDate(subscription.current_period_start)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    Окончание периода
                  </div>
                  <div style={{ fontSize: '13px', color: '#1e293b' }}>
                    {formatDate(subscription.current_period_end)}
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
