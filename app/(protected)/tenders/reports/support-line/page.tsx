'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface Guarantee {
  id: string;
  tender: string;
  type: 'bid' | 'contract' | 'warranty';
  amount: number;
  bank: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'returned';
}

export default function SupportLineReportPage() {
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring'>('all');

  useEffect(() => {
    loadGuarantees();
  }, [filter]);

  const loadGuarantees = async () => {
    try {
      setLoading(true);
      // Симуляция данных
      const mockData: Guarantee[] = [
        { id: '1', tender: 'Поставка медоборудования', type: 'bid', amount: 500000, bank: 'Сбербанк', startDate: '2024-10-01', endDate: '2024-12-01', status: 'active' },
        { id: '2', tender: 'Строительные работы', type: 'contract', amount: 2000000, bank: 'ВТБ', startDate: '2024-09-15', endDate: '2025-03-15', status: 'active' },
        { id: '3', tender: 'IT услуги', type: 'warranty', amount: 300000, bank: 'Альфа-Банк', startDate: '2024-08-01', endDate: '2024-11-20', status: 'active' },
        { id: '4', tender: 'Поставка мебели', type: 'bid', amount: 150000, bank: 'Газпромбанк', startDate: '2024-07-01', endDate: '2024-10-01', status: 'expired' },
        { id: '5', tender: 'Ремонт помещений', type: 'contract', amount: 1500000, bank: 'Сбербанк', startDate: '2024-06-01', endDate: '2024-11-25', status: 'active' },
      ];
      setGuarantees(mockData);
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

  const getTypeLabel = (type: string) => {
    const labels = {
      bid: 'Заявка',
      contract: 'Контракт',
      warranty: 'Гарантия',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const isExpiringSoon = (endDate: string) => {
    const daysUntilExpiry = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
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
    total: guarantees.length,
    active: guarantees.filter(g => g.status === 'active').length,
    expiring: guarantees.filter(g => isExpiringSoon(g.endDate) && g.status === 'active').length,
    totalAmount: guarantees.reduce((sum, g) => sum + g.amount, 0),
    activeAmount: guarantees.filter(g => g.status === 'active').reduce((sum, g) => sum + g.amount, 0),
  };

  const filteredGuarantees = guarantees.filter(g => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'expiring') return isExpiringSoon(g.endDate) && g.status === 'active';
    return true;
  });

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>🛡️ Линейка обеспечения</h1>
            <p className={styles.pageDescription}>Банковские гарантии и залоги</p>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            📥 Экспорт
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего гарантий</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Активные</div>
          <div className={styles.statValue}>{stats.active}</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Истекают</div>
          <div className={styles.statValue}>{stats.expiring}</div>
        </div>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Общая сумма</div>
          <div className={styles.statValue} style={{ fontSize: '1.5rem' }}>{formatCurrency(stats.totalAmount)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>В работе</div>
          <div className={styles.statValue} style={{ fontSize: '1.5rem' }}>{formatCurrency(stats.activeAmount)}</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles.btnGroup}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Все ({stats.total})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={filter === 'active' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Активные ({stats.active})
        </button>
        <button
          onClick={() => setFilter('expiring')}
          className={filter === 'expiring' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Истекают ({stats.expiring})
        </button>
      </div>

      {/* Таблица гарантий */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Список гарантий</h3>
        <table className={styles.table}>
          <thead>
              <tr>
                <th>Тендер</th>
                <th style={{ textAlign: 'center' }}>Тип</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th>Банк</th>
                <th style={{ textAlign: 'center' }}>Срок</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
          <tbody>
              {filteredGuarantees.map((guarantee) => {
                const expiring = isExpiringSoon(guarantee.endDate);
                return (
                  <tr key={guarantee.id} style={{ backgroundColor: expiring ? '#fff7ed' : 'transparent' }}>
                    <td>{guarantee.tender}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={guarantee.type === 'bid' ? styles.badgeInfo : guarantee.type === 'contract' ? styles.badgeSuccess : styles.badgeWarning}>
                        {getTypeLabel(guarantee.type)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(guarantee.amount)}
                    </td>
                    <td>{guarantee.bank}</td>
                    <td style={{ textAlign: 'center' }}>
                      {formatDate(guarantee.startDate)} - {formatDate(guarantee.endDate)}
                      {expiring && <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 600, marginTop: '0.25rem' }}>Истекает скоро!</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={guarantee.status === 'active' ? styles.badgeSuccess : guarantee.status === 'expired' ? styles.badgeDanger : styles.badgeSecondary}>
                        {guarantee.status === 'active' ? 'Активна' : guarantee.status === 'expired' ? 'Истекла' : 'Возвращена'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', border: '2px solid #f97316' }}>
        <h3 className={styles.cardTitle} style={{ color: '#9a3412' }}>⚠️ Важно</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#9a3412' }}>
          <li>• Активных гарантий: {stats.active} на сумму {formatCurrency(stats.activeAmount)}</li>
          <li>• Истекают в ближайшие 30 дней: {stats.expiring} {stats.expiring > 0 ? '- требуют продления!' : ''}</li>
          <li>• Контролируйте сроки действия гарантий для избежания штрафов</li>
          <li>• Своевременно возвращайте гарантии после завершения контрактов</li>
        </ul>
      </div>
    </div>
  );
}
