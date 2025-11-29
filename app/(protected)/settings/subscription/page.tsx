import { createRSCClient } from '@/lib/supabase/server';
import { getOrganizationSubscription } from '@/lib/billing/subscription-service';
import { getCurrentOrganization } from '@/lib/platform/organization';

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
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Подписка</h1>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <span className="material-icons" style={{ fontSize: '48px', color: '#f59e0b' }}>
            warning
          </span>
          <h3 style={{ margin: '12px 0 8px', color: '#92400e' }}>Организация не найдена</h3>
          <p style={{ margin: 0, color: '#a16207' }}>
            Вы не являетесь членом организации
          </p>
        </div>
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
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 600, 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span className="material-icons" style={{ color: '#667eea' }}>card_membership</span>
          Подписка
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Информация о подписке организации &laquo;{organization.name}&raquo;
        </p>
      </div>

      {!subscription ? (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <span className="material-icons" style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '12px' }}>
            warning
          </span>
          <h3 style={{ margin: '0 0 8px', color: '#92400e' }}>Нет активной подписки</h3>
          <p style={{ margin: 0, color: '#a16207' }}>
            Обратитесь к администратору для активации подписки
          </p>
        </div>
      ) : (
        <>
          {/* Статус-карточки */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Статус подписки */}
            <div style={{
              background: subscription.status === 'active' 
                ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
                : '#fef3c7',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '28px', 
                color: subscription.status === 'active' ? '#16a34a' : '#f59e0b',
                marginBottom: '8px'
              }}>
                {subscription.status === 'active' ? 'check_circle' : 'schedule'}
              </span>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Статус</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                {subscription.status === 'active' ? 'Активна' : 
                 subscription.status === 'trial' ? 'Пробный период' :
                 subscription.status === 'expired' ? 'Истекла' : 'Отменена'}
              </div>
            </div>

            {/* Дни до окончания */}
            <div style={{
              background: daysUntilExpiry <= 7 
                ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' 
                : daysUntilExpiry <= 30
                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '28px', 
                color: daysUntilExpiry <= 7 ? '#dc2626' : daysUntilExpiry <= 30 ? '#f59e0b' : '#0284c7',
                marginBottom: '8px'
              }}>
                schedule
              </span>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>До окончания</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                {daysUntilExpiry} дн.
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                до {formatDate(subscription.current_period_end)}
              </div>
            </div>

            {/* Сотрудники */}
            <div style={{
              background: maxUsers && currentUsers >= maxUsers 
                ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '28px', 
                color: maxUsers && currentUsers >= maxUsers ? '#dc2626' : '#16a34a',
                marginBottom: '8px'
              }}>
                group
              </span>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Сотрудников</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                {currentUsers} / {maxUsers || '∞'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Вкл.: {usersIncluded}
              </div>
            </div>

            {/* Тариф */}
            <div style={{
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '28px', 
                color: '#7c3aed',
                marginBottom: '8px'
              }}>
                workspace_premium
              </span>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Тариф</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                {subscription.plan?.name || 'Не указан'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {subscription.billing_period === 'monthly' ? 'Месяц' : 'Год'}
              </div>
            </div>
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

          {/* Информация */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <span className="material-icons" style={{ color: '#0284c7', marginTop: '2px' }}>
              info
            </span>
            <div>
              <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '4px' }}>
                Нужна помощь?
              </div>
              <div style={{ fontSize: '13px', color: '#0c4a6e' }}>
                Для изменения тарифа или других вопросов по подписке 
                обратитесь к администратору системы.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
