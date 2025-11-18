'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface CustomerDebt {
  id: string;
  customer: string;
  contract: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  dueDate: string;
  daysOverdue: number;
  status: 'current' | 'overdue' | 'critical';
}

export default function CustomerLineReportPage() {
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'amount' | 'overdue'>('amount');

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setLoading(true);
      // Симуляция данных
      const mockData: CustomerDebt[] = [
        { id: '1', customer: 'ГБУЗ "Больница №1"', contract: '№123-2024', totalAmount: 15000000, paidAmount: 9000000, debtAmount: 6000000, dueDate: '2024-11-15', daysOverdue: 0, status: 'overdue' },
        { id: '2', customer: 'Администрация города', contract: '№456-2024', totalAmount: 12000000, paidAmount: 12000000, debtAmount: 0, dueDate: '2024-12-01', daysOverdue: 0, status: 'current' },
        { id: '3', customer: 'МВД России', contract: '№789-2024', totalAmount: 8000000, paidAmount: 3000000, debtAmount: 5000000, dueDate: '2024-10-20', daysOverdue: 22, status: 'critical' },
        { id: '4', customer: 'Минобразования', contract: '№101-2024', totalAmount: 10000000, paidAmount: 7000000, debtAmount: 3000000, dueDate: '2024-11-25', daysOverdue: 0, status: 'current' },
        { id: '5', customer: 'ФНС России', contract: '№202-2024', totalAmount: 6000000, paidAmount: 2000000, debtAmount: 4000000, dueDate: '2024-11-10', daysOverdue: 1, status: 'overdue' },
        { id: '6', customer: 'Росздравнадзор', contract: '№303-2024', totalAmount: 5000000, paidAmount: 5000000, debtAmount: 0, dueDate: '2024-12-15', daysOverdue: 0, status: 'current' },
      ];
      setDebts(mockData);
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

  const getStatusLabel = (status: string) => {
    const labels = {
      current: 'В срок',
      overdue: 'Просрочено',
      critical: 'Критично',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const stats = {
    totalDebt: debts.reduce((sum, d) => sum + d.debtAmount, 0),
    overdueDebt: debts.filter(d => d.status !== 'current').reduce((sum, d) => sum + d.debtAmount, 0),
    criticalDebt: debts.filter(d => d.status === 'critical').reduce((sum, d) => sum + d.debtAmount, 0),
    customersWithDebt: debts.filter(d => d.debtAmount > 0).length,
    avgPaymentRate: debts.length > 0 ? (debts.reduce((sum, d) => sum + (d.paidAmount / d.totalAmount) * 100, 0) / debts.length) : 0,
  };

  const sortedDebts = [...debts].sort((a, b) => {
    if (sortBy === 'amount') return b.debtAmount - a.debtAmount;
    return b.daysOverdue - a.daysOverdue;
  });

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>💰 Деньги у заказчиков</h1>
            <p className={styles.pageDescription}>Дебиторская задолженность</p>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            📥 Экспорт
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Общая задолженность</div>
          <div className={styles.statValue}>{formatCurrency(stats.totalDebt)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{stats.customersWithDebt} заказчиков</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Просрочено</div>
          <div className={styles.statValue}>{formatCurrency(stats.overdueDebt)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Требует внимания</div>
        </div>
        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statLabel}>Критично</div>
          <div className={styles.statValue}>{formatCurrency(stats.criticalDebt)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Срочно взыскать</div>
        </div>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Ср. % оплаты</div>
          <div className={styles.statValue}>{stats.avgPaymentRate.toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>По всем контрактам</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Доля просрочки</div>
          <div className={styles.statValue}>
            {stats.totalDebt > 0 ? ((stats.overdueDebt / stats.totalDebt) * 100).toFixed(1) : 0}%
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>От общей суммы</div>
        </div>
      </div>

      {/* Сортировка */}
      <div className={styles.btnGroup}>
        <button
          onClick={() => setSortBy('amount')}
          className={sortBy === 'amount' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          По сумме
        </button>
        <button
          onClick={() => setSortBy('overdue')}
          className={sortBy === 'overdue' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          По просрочке
        </button>
      </div>

      {/* Таблица задолженностей */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Дебиторская задолженность</h3>
        <table className={styles.table}>
          <thead>
              <tr>
                <th>Заказчик</th>
                <th>Контракт</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th style={{ textAlign: 'right' }}>Оплачено</th>
                <th style={{ textAlign: 'right' }}>Долг</th>
                <th style={{ textAlign: 'center' }}>Срок</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
          <tbody>
              {sortedDebts.map((debt) => {
                const paymentRate = (debt.paidAmount / debt.totalAmount) * 100;
                return (
                  <tr key={debt.id} style={{ backgroundColor: debt.status === 'critical' ? '#fee2e2' : debt.status === 'overdue' ? '#fef3c7' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{debt.customer}</td>
                    <td>{debt.contract}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(debt.totalAmount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(debt.paidAmount)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{paymentRate.toFixed(0)}%</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: debt.debtAmount > 0 ? '#ef4444' : '#10b981' }}>
                        {formatCurrency(debt.debtAmount)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div>{formatDate(debt.dueDate)}</div>
                      {debt.daysOverdue > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '0.25rem' }}>
                          +{debt.daysOverdue} дн.
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={debt.status === 'critical' ? styles.badgeDanger : debt.status === 'overdue' ? styles.badgeWarning : styles.badgeSuccess}>
                        {getStatusLabel(debt.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #ef4444' }}>
        <h3 className={styles.cardTitle} style={{ color: '#7f1d1d' }}>⚠️ Действия</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
          <li>• Общая задолженность: {formatCurrency(stats.totalDebt)} - {stats.totalDebt > 0 ? 'требуется взыскание' : 'отлично!'}</li>
          <li>• Критическая просрочка: {formatCurrency(stats.criticalDebt)} - {stats.criticalDebt > 0 ? 'срочно отправить претензии!' : 'нет критичных'}</li>
          <li>• Средний % оплаты {stats.avgPaymentRate.toFixed(1)}% - {stats.avgPaymentRate > 70 ? 'хорошая платежная дисциплина' : 'нужно усилить работу'}</li>
          <li>• Отправьте напоминания заказчикам с просрочкой</li>
          <li>• При необходимости подготовьте претензии и иски</li>
        </ul>
      </div>
    </div>
  );
}
