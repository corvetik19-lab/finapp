import { getAllPayments } from '@/lib/billing/subscription-service';
import type { PaymentStatus } from '@/types/billing';
import styles from '../superadmin.module.css';

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
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

function getPaymentStatusClass(status: PaymentStatus): string {
  switch (status) {
    case 'completed': return styles.active;
    case 'pending': return styles.trial;
    case 'processing': return styles.trial;
    case 'failed': return styles.expired;
    case 'refunded': return styles.cancelled;
    default: return '';
  }
}

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const payments = await getAllPayments(100);

  // Считаем статистику
  const totalAmount = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>История платежей</h1>
        <p className={styles.pageDescription}>
          Все платежи за подписки на платформе
        </p>
      </header>

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего оплачено</span>
            <div className={styles.statIcon}>
              <span className="material-icons">check_circle</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(totalAmount)}</div>
        </div>

        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Ожидают оплаты</span>
            <div className={styles.statIcon}>
              <span className="material-icons">hourglass_empty</span>
            </div>
          </div>
          <div className={styles.statValue}>{formatMoney(pendingAmount)}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Всего платежей</span>
            <div className={styles.statIcon}>
              <span className="material-icons">receipt_long</span>
            </div>
          </div>
          <div className={styles.statValue}>{payments.length}</div>
        </div>
      </div>

      {/* Таблица платежей */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Последние платежи</h3>
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
                <th>Организация</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Метод оплаты</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.payment_date 
                      ? formatDateTime(payment.payment_date) 
                      : formatDateTime(payment.created_at)
                    }
                  </td>
                  <td>
                    <div className={styles.orgCell}>
                      <div className={styles.orgAvatar} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {(payment.organization as { name?: string })?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span>{(payment.organization as { name?: string })?.name || 'Неизвестно'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.amount} ${styles.large}`}>
                      {formatMoney(payment.amount)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getPaymentStatusClass(payment.status)}`}>
                      {getPaymentStatusLabel(payment.status)}
                    </span>
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
            <p>Платежи появятся после оплаты подписок</p>
          </div>
        )}
      </div>
    </div>
  );
}
