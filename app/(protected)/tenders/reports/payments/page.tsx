'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface PaymentStats {
  overview: {
    totalPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    avgPaymentDays: number;
  };
  byStatus: Record<string, { count: number; amount: number }>;
  byMonth: Array<{ month: string; paid: number; pending: number; amount: number }>;
  upcoming: Array<{ contract: string; amount: number; dueDate: string; status: string }>;
}

export default function PaymentsReportPage() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/stats?company_id=${companyId}`);
      if (!response.ok) throw new Error('Ошибка');
      
      const data = await response.json();
      
      const contractPrice = data.overview?.totalContractPrice ?? 0;
      
      // Симулируем данные по оплатам
      const mockStats: PaymentStats = {
        overview: {
          totalPayments: 45,
          totalAmount: contractPrice,
          paidAmount: Math.floor(contractPrice * 0.6),
          pendingAmount: Math.floor(contractPrice * 0.3),
          overdueAmount: Math.floor(contractPrice * 0.1),
          avgPaymentDays: 28,
        },
        byStatus: {
          'Оплачено': { count: 27, amount: Math.floor(contractPrice * 0.6) },
          'Ожидает': { count: 12, amount: Math.floor(contractPrice * 0.3) },
          'Просрочено': { count: 6, amount: Math.floor(contractPrice * 0.1) },
        },
        byMonth: (data.monthly ?? []).map((m: { month: string; count: number; won: number; nmck: number }) => ({
          month: m.month,
          paid: m.won * 2,
          pending: m.won,
          amount: m.nmck * 0.7,
        })),
        upcoming: [
          { contract: 'Контракт №123-2024', amount: 5000000, dueDate: '2024-11-20', status: 'pending' },
          { contract: 'Контракт №456-2024', amount: 3500000, dueDate: '2024-11-25', status: 'pending' },
          { contract: 'Контракт №789-2024', amount: 8000000, dueDate: '2024-11-15', status: 'overdue' },
          { contract: 'Контракт №101-2024', amount: 2000000, dueDate: '2024-12-01', status: 'pending' },
          { contract: 'Контракт №202-2024', amount: 4500000, dueDate: '2024-12-10', status: 'pending' },
        ],
      };
      
      setStats(mockStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading || !stats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const { overview, byStatus, byMonth, upcoming } = stats;
  const paymentRate = overview.totalAmount > 0 
    ? (overview.paidAmount / overview.totalAmount) * 100 
    : 0;

  const sortedUpcoming = [...upcoming].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return b.amount - a.amount;
  });

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>💳 Реестр оплат</h1>
            <p className={styles.pageDescription}>Учет всех платежей по контрактам</p>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            📥 Экспорт
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего платежей</div>
          <div className={styles.statValue}>{overview.totalPayments}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Общая сумма: {formatCurrency(overview.totalAmount)}</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Оплачено</div>
          <div className={styles.statValue}>{formatCurrency(overview.paidAmount)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{paymentRate.toFixed(1)}% от общей суммы</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Ожидает оплаты</div>
          <div className={styles.statValue}>{formatCurrency(overview.pendingAmount)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Требует внимания</div>
        </div>
        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statLabel}>Просрочено</div>
          <div className={styles.statValue}>{formatCurrency(overview.overdueAmount)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ср. срок: {overview.avgPaymentDays} дн</div>
        </div>
      </div>

      {/* Прогресс оплат */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Прогресс оплат</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Оплачено</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>{formatCurrency(overview.paidAmount)}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                style={{ height: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '9999px', width: `${paymentRate}%` }} 
              />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Ожидает</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(overview.pendingAmount)}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                style={{ height: '100%', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '9999px', width: `${(overview.pendingAmount / overview.totalAmount) * 100}%` }} 
              />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Просрочено</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(overview.overdueAmount)}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                style={{ height: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '9999px', width: `${(overview.overdueAmount / overview.totalAmount) * 100}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Распределение по статусам */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Распределение по статусам</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(byStatus).map(([status, data]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{status}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{data.count} платежей</div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  {formatCurrency(data.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Динамика по месяцам</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {byMonth.slice(-6).map((month) => (
              <div key={month.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>{month.month}</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ color: '#10b981' }}>✓ {month.paid}</span>
                  <span style={{ color: '#f59e0b' }}>⏳ {month.pending}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Предстоящие платежи */}
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className={styles.cardTitle}>Предстоящие платежи</h3>
          <div className={styles.btnGroup}>
            <button
              onClick={() => setSortBy('date')}
              className={sortBy === 'date' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
            >
              По дате
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={sortBy === 'amount' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
            >
              По сумме
            </button>
          </div>
        </div>
        <table className={styles.table}>
          <thead>
              <tr>
                <th>Контракт</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th style={{ textAlign: 'right' }}>Срок оплаты</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
          <tbody>
              {sortedUpcoming.map((payment, index) => {
                const overdue = isOverdue(payment.dueDate);
                return (
                  <tr key={index} style={{ backgroundColor: overdue ? '#fee2e2' : 'transparent' }}>
                    <td>{payment.contract}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td style={{ textAlign: 'right', color: overdue ? '#ef4444' : '#334155', fontWeight: overdue ? 600 : 400 }}>
                      {formatDate(payment.dueDate)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={overdue ? styles.badgeDanger : styles.badgeWarning}>
                        {overdue ? 'Просрочено' : 'Ожидает'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #3b82f6' }}>
        <h3 className={styles.cardTitle} style={{ color: '#1e40af' }}>💡 Рекомендации</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#1e40af' }}>
          <li>• Процент оплат {paymentRate.toFixed(1)}% - {paymentRate > 70 ? 'хороший показатель' : 'требует улучшения'}</li>
          <li>• Просроченных платежей: {formatCurrency(overview.overdueAmount)} - {overview.overdueAmount > 0 ? 'требуют немедленного взыскания' : 'отлично!'}</li>
          <li>• Средний срок оплаты {overview.avgPaymentDays} дней - {overview.avgPaymentDays < 30 ? 'в пределах нормы' : 'можно ускорить'}</li>
          <li>• Ожидает оплаты: {formatCurrency(overview.pendingAmount)} - контролируйте сроки</li>
        </ul>
      </div>
    </div>
  );
}
