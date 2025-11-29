'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface Payout {
  id: string;
  date: string;
  recipient: string;
  category: 'supplier' | 'employee' | 'tax' | 'other';
  amount: number;
  contract: string | null;
  status: 'paid' | 'pending' | 'scheduled';
}

export default function PayoutsReportPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    loadPayouts();
  }, [filter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      // Симуляция данных
      const mockData: Payout[] = [
        { id: '1', date: '2024-11-05', recipient: 'ООО "Поставщик 1"', category: 'supplier', amount: 5000000, contract: '№123-2024', status: 'paid' },
        { id: '2', date: '2024-11-10', recipient: 'Иванов И.И.', category: 'employee', amount: 150000, contract: null, status: 'paid' },
        { id: '3', date: '2024-11-15', recipient: 'ФНС России', category: 'tax', amount: 800000, contract: null, status: 'pending' },
        { id: '4', date: '2024-11-12', recipient: 'ООО "Поставщик 2"', category: 'supplier', amount: 3500000, contract: '№456-2024', status: 'paid' },
        { id: '5', date: '2024-11-20', recipient: 'Петров П.П.', category: 'employee', amount: 180000, contract: null, status: 'scheduled' },
        { id: '6', date: '2024-11-08', recipient: 'Аренда офиса', category: 'other', amount: 250000, contract: null, status: 'paid' },
        { id: '7', date: '2024-11-18', recipient: 'ООО "Поставщик 3"', category: 'supplier', amount: 2000000, contract: '№789-2024', status: 'pending' },
      ];
      setPayouts(mockData);
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

  const getCategoryLabel = (category: string) => {
    const labels = {
      supplier: 'Поставщик',
      employee: 'Сотрудник',
      tax: 'Налоги',
      other: 'Прочее',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      paid: 'Выплачено',
      pending: 'Ожидает',
      scheduled: 'Запланировано',
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

  const filteredPayouts = payouts.filter(p => {
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'pending') return p.status === 'pending' || p.status === 'scheduled';
    return true;
  });

  const stats = {
    total: payouts.reduce((sum, p) => sum + p.amount, 0),
    paid: payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pending: payouts.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0),
    byCategory: {
      supplier: payouts.filter(p => p.category === 'supplier').reduce((sum, p) => sum + p.amount, 0),
      employee: payouts.filter(p => p.category === 'employee').reduce((sum, p) => sum + p.amount, 0),
      tax: payouts.filter(p => p.category === 'tax').reduce((sum, p) => sum + p.amount, 0),
      other: payouts.filter(p => p.category === 'other').reduce((sum, p) => sum + p.amount, 0),
    },
  };

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>💸 Расходы</h1>
            <p className={styles.pageDescription}>Выплаты поставщикам, сотрудникам и прочие расходы</p>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            📥 Экспорт
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего выплат</div>
          <div className={styles.statValue}>{formatCurrency(stats.total)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{payouts.length} операций</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Выплачено</div>
          <div className={styles.statValue}>{formatCurrency(stats.paid)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{((stats.paid / stats.total) * 100).toFixed(1)}% от общей суммы</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Ожидает выплаты</div>
          <div className={styles.statValue}>{formatCurrency(stats.pending)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Требует обработки</div>
        </div>
      </div>

      {/* Распределение по категориям */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Распределение по категориям</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#eff6ff', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Поставщики</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{payouts.filter(p => p.category === 'supplier').length} выплат</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(stats.byCategory.supplier)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f0fdf4', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Сотрудники</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{payouts.filter(p => p.category === 'employee').length} выплат</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(stats.byCategory.employee)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#faf5ff', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Налоги</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{payouts.filter(p => p.category === 'tax').length} выплат</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{formatCurrency(stats.byCategory.tax)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Прочее</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{payouts.filter(p => p.category === 'other').length} выплат</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748b' }}>{formatCurrency(stats.byCategory.other)}</div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles.btnGroup}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Все ({payouts.length})
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={filter === 'paid' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Выплачено ({payouts.filter(p => p.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Ожидает ({payouts.filter(p => p.status !== 'paid').length})
        </button>
      </div>

      {/* Таблица выплат */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Список выплат</h3>
        <table className={styles.table}>
          <thead>
              <tr>
                <th>Дата</th>
                <th>Получатель</th>
                <th style={{ textAlign: 'center' }}>Категория</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th>Контракт</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
          <tbody>
              {filteredPayouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{formatDate(payout.date)}</td>
                  <td style={{ fontWeight: 600 }}>{payout.recipient}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={payout.category === 'supplier' ? styles.badgeInfo : payout.category === 'employee' ? styles.badgeSuccess : payout.category === 'tax' ? styles.badgeWarning : styles.badgeSecondary}>
                      {getCategoryLabel(payout.category)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(payout.amount)}
                  </td>
                  <td>{payout.contract || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={payout.status === 'paid' ? styles.badgeSuccess : payout.status === 'pending' ? styles.badgeWarning : styles.badgeInfo}>
                      {getStatusLabel(payout.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #10b981' }}>
        <h3 className={styles.cardTitle} style={{ color: '#065f46' }}>💡 Аналитика</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#065f46' }}>
          <li>• Всего выплат: {formatCurrency(stats.total)} за период</li>
          <li>• Выплачено {((stats.paid / stats.total) * 100).toFixed(1)}% от запланированного</li>
          <li>• Основная категория расходов: Поставщики ({formatCurrency(stats.byCategory.supplier)})</li>
          <li>• Ожидает выплаты: {formatCurrency(stats.pending)} - контролируйте сроки</li>
          <li>• Средняя выплата: {formatCurrency(stats.total / payouts.length)}</li>
        </ul>
      </div>
    </div>
  );
}
