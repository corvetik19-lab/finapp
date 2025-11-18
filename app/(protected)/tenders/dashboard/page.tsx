'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../tenders.module.css';

interface TenderStats {
  overview: {
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    totalNmck: number;
    totalContractPrice: number;
    totalSavings: number;
    winRate: number;
  };
  byStage: Record<string, { count: number; nmck: number; color: string }>;
  byType: Record<string, { count: number; nmck: number }>;
  monthly: Array<{ month: string; count: number; nmck: number; won: number }>;
  topManagers: Array<{
    name: string;
    count: number;
    won: number;
    nmck: number;
    contractPrice: number;
    winRate: number;
  }>;
}

export default function TenderDashboardPage() {
  const [stats, setStats] = useState<TenderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/stats?company_id=${companyId}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.tendersContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p style={{ marginTop: '1rem' }}>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={styles.tendersContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>⚠️</div>
          <h3 className={styles.emptyStateTitle}>Ошибка загрузки</h3>
          <p className={styles.emptyStateText}>{error || 'Нет данных'}</p>
          <button
            onClick={loadStats}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const { overview, byStage, byType, monthly, topManagers } = stats;

  return (
    <div className={styles.tendersContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              Дашборд тендеров
            </h1>
            <p className={styles.pageDescription}>
              Аналитика и ключевые показатели эффективности
            </p>
          </div>
          <Link
            href="/tenders/department"
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Перейти к тендерам
          </Link>
        </div>
      </div>

      {/* Основные метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>📊 Всего тендеров</div>
          <div className={styles.statValue}>{overview.totalTenders}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
            Активных: {overview.activeTenders}
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>✅ Выиграно</div>
          <div className={styles.statValue}>{overview.wonTenders}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
            Процент побед: {overview.winRate.toFixed(1)}%
          </div>
        </div>

        <div className={`${styles.statCard}`} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
          <div className={styles.statLabel}>💰 Общая НМЦК</div>
          <div className={styles.statValue} style={{ fontSize: '1.75rem' }}>
            {formatCurrency(overview.totalNmck)}
          </div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
            Контракты: {formatCurrency(overview.totalContractPrice)}
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>💎 Экономия</div>
          <div className={styles.statValue} style={{ fontSize: '1.75rem' }}>
            {formatCurrency(overview.totalSavings)}
          </div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
            {overview.totalNmck > 0
              ? ((overview.totalSavings / overview.totalNmck) * 100).toFixed(1)
              : 0}
            % от НМЦК
          </div>
        </div>
      </div>

      {/* Графики */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Статистика по этапам */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>📈 Тендеры по этапам</h3>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(byStage).map(([stage, data]) => (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>{stage}</span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{data.count}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${(data.count / overview.totalTenders) * 100}%`,
                        background: data.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Статистика по типам */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>🏷️ Тендеры по типам</h3>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(byType).map(([type, data]) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>{type}</span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{data.count}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${(data.count / overview.totalTenders) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Динамика по месяцам */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>📅 Динамика за последние 12 месяцев</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Месяц</th>
                <th style={{ textAlign: 'right' }}>Тендеров</th>
                <th style={{ textAlign: 'right' }}>Выиграно</th>
                <th style={{ textAlign: 'right' }}>НМЦК</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((month) => (
                <tr key={month.month}>
                  <td><strong>{month.month}</strong></td>
                  <td style={{ textAlign: 'right' }}>{month.count}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>{month.won}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatCurrency(month.nmck)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Топ менеджеров */}
      {topManagers.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>🏆 Топ менеджеров</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Менеджер</th>
                  <th style={{ textAlign: 'right' }}>Тендеров</th>
                  <th style={{ textAlign: 'right' }}>Выиграно</th>
                  <th style={{ textAlign: 'right' }}>% побед</th>
                  <th style={{ textAlign: 'right' }}>Контракты</th>
                </tr>
              </thead>
              <tbody>
                {topManagers.map((manager, index) => (
                  <tr key={manager.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        <strong>{manager.name}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{manager.count}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>{manager.won}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>{manager.winRate.toFixed(1)}%</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{formatCurrency(manager.contractPrice)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
