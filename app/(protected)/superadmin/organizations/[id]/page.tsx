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
import styles from '../../superadmin.module.css';

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

function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'completed': return 'Оплачен';
    case 'pending': return 'Ожидает';
    case 'processing': return 'Обработка';
    case 'failed': return 'Ошибка';
    case 'refunded': return 'Возврат';
    default: return status;
  }
}

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
  const { data: allMembers } = await supabase
    .from('company_members')
    .select(`
      id,
      role,
      status,
      created_at,
      user:profiles(id, full_name, global_role),
      company:companies(name)
    `)
    .in('company_id', companyIds)
    .eq('status', 'active');

  // Filter out super admins from members list
  const members = (allMembers || []).filter(m => {
    const user = m.user as { global_role?: string } | null;
    return user?.global_role !== 'super_admin';
  });

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
    <div>
      <header className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <Link href="/superadmin/billing" style={{ color: '#64748b' }}>
            <span className="material-icons">arrow_back</span>
          </Link>
          <h1 className={styles.pageTitle}>{organization.name}</h1>
        </div>
        <p className={styles.pageDescription}>
          ID: {organization.id} • Создана {formatDate(organization.created_at)}
        </p>
      </header>

      {/* Информация о подписке */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${subscription?.status === 'active' ? styles.success : styles.warning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Статус подписки</span>
            <div className={styles.statIcon}>
              <span className="material-icons">
                {subscription?.status === 'active' ? 'check_circle' : 'warning'}
              </span>
            </div>
          </div>
          <div className={styles.statValue}>
            {subscription ? (
              subscription.status === 'active' ? 'Активна' :
              subscription.status === 'trial' ? 'Пробный период' :
              subscription.status === 'expired' ? 'Истекла' :
              subscription.status === 'cancelled' ? 'Отменена' : 'Просрочена'
            ) : 'Нет подписки'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Тариф</span>
            <div className={styles.statIcon}>
              <span className="material-icons">inventory_2</span>
            </div>
          </div>
          <div className={styles.statValue}>{subscription?.plan?.name || '—'}</div>
          {subscription && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {subscription.billing_period === 'yearly' ? 'Годовая оплата' : 'Месячная оплата'}
            </div>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Пользователей</span>
            <div className={styles.statIcon}>
              <span className="material-icons">group</span>
            </div>
          </div>
          <div className={styles.statValue}>{members?.length || 0}</div>
          {subscription && subscription.plan && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Включено: {subscription.plan.users_included}, макс: {subscription.plan.max_users || '∞'}
            </div>
          )}
        </div>

        <div className={`${styles.statCard} ${daysUntilExpiry <= 7 ? styles.danger : ''}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>До окончания</span>
            <div className={styles.statIcon}>
              <span className="material-icons">schedule</span>
            </div>
          </div>
          <div className={styles.statValue}>
            {subscription ? (daysUntilExpiry > 0 ? `${daysUntilExpiry} дней` : 'Истекла') : '—'}
          </div>
          {subscription && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              до {formatDate(subscription.current_period_end)}
            </div>
          )}
        </div>
      </div>

      {/* Кнопка создания подписки если её нет */}
      {!subscription && (
        <div className={styles.subscriptionDetails} style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}>
              card_membership
            </span>
            <h3 style={{ fontSize: '16px', color: '#64748b', marginBottom: '16px' }}>
              У организации нет активной подписки
            </h3>
            <OrganizationActions
              organizationId={organizationId}
              organizationName={organization.name}
              subscription={null}
              plans={plans}
            />
          </div>
        </div>
      )}

      {/* Детали подписки */}
      {subscription && (
        <div className={styles.subscriptionDetails} style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Детали подписки
          </h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Базовая стоимость</span>
              <span className={styles.detailValue}>{formatMoney(subscription.base_amount)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>За доп. пользователей</span>
              <span className={styles.detailValue}>{formatMoney(subscription.users_amount)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Скидка</span>
              <span className={styles.detailValue}>
                {subscription.discount_percent > 0 
                  ? `${subscription.discount_percent}% (${formatMoney(subscription.discount_amount)})`
                  : '—'
                }
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Итого</span>
              <span className={styles.detailValue} style={{ color: '#667eea', fontSize: '20px' }}>
                {formatMoney(subscription.total_amount)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Начало периода</span>
              <span className={styles.detailValue}>{formatDate(subscription.current_period_start)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Следующий платёж</span>
              <span className={styles.detailValue}>
                {subscription.next_payment_date 
                  ? `${formatMoney(subscription.next_payment_amount || 0)} — ${formatDate(subscription.next_payment_date)}`
                  : '—'
                }
              </span>
            </div>
          </div>

          {/* Действия с подпиской */}
          <OrganizationActions
            organizationId={organizationId}
            organizationName={organization.name}
            subscription={subscription}
            plans={plans}
          />
        </div>
      )}

      {/* Пользователи организации */}
      <div className={styles.tableContainer} style={{ marginBottom: '24px' }}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Пользователи ({members?.length || 0})</h3>
        </div>
        {members && members.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Компания</th>
                <th>Роль</th>
                <th>Добавлен</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.orgCell}>
                      <div className={styles.orgAvatar} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {(member.user as { full_name?: string })?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span>{(member.user as { full_name?: string })?.full_name || 'Без имени'}</span>
                    </div>
                  </td>
                  <td>{(member.company as { name?: string })?.name || '—'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${member.role === 'admin' || member.role === 'owner' ? styles.active : ''}`}>
                      {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Админ' : 'Участник'}
                    </span>
                  </td>
                  <td>{formatDateTime(member.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <span className="material-icons">group</span>
            <h3>Нет пользователей</h3>
          </div>
        )}
      </div>

      {/* История платежей */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>История платежей ({payments.length})</h3>
          <button className={`${styles.button} ${styles.primary}`}>
            <span className="material-icons">add</span>
            Добавить платёж
          </button>
        </div>
        {payments.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Период</th>
                <th>Метод</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.payment_date ? formatDateTime(payment.payment_date) : '—'}</td>
                  <td className={styles.amount}>{formatMoney(payment.amount)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${payment.status === 'completed' ? styles.active : styles.warning}`}>
                      {getPaymentStatusLabel(payment.status)}
                    </span>
                  </td>
                  <td>
                    {payment.period_start && payment.period_end 
                      ? `${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}`
                      : '—'
                    }
                  </td>
                  <td>{payment.payment_method || '—'}</td>
                  <td>{payment.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <span className="material-icons">receipt_long</span>
            <h3>Нет платежей</h3>
            <p>Платежи появятся после оплаты подписки</p>
          </div>
        )}
      </div>
    </div>
  );
}
