'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface RealizationStats {
  overview: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    problemContracts: number;
    totalVolume: number;
    completedVolume: number;
    avgCompletionDays: number;
  };
  byStage: Record<string, { count: number; volume: number }>;
  byMonth: Array<{ month: string; started: number; completed: number; volume: number }>;
  problems: Array<{ contract: string; issue: string; days: number; severity: string }>;
}

export default function RealizationReportPage() {
  const [stats, setStats] = useState<RealizationStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      // Симулируем данные по реализации
      const mockStats: RealizationStats = {
        overview: {
          totalContracts: data.data.overview.wonTenders || 0,
          activeContracts: Math.floor((data.data.overview.wonTenders || 0) * 0.6),
          completedContracts: Math.floor((data.data.overview.wonTenders || 0) * 0.3),
          problemContracts: Math.floor((data.data.overview.wonTenders || 0) * 0.1),
          totalVolume: data.data.overview.totalContractPrice || 0,
          completedVolume: Math.floor((data.data.overview.totalContractPrice || 0) * 0.4),
          avgCompletionDays: 45,
        },
        byStage: {
          'Новая заявка': { count: 3, volume: 5000000 },
          'В работе': { count: 8, volume: 15000000 },
          'Ожидание': { count: 2, volume: 3000000 },
          'Завершено': { count: 5, volume: 12000000 },
          'Проблема': { count: 1, volume: 2000000 },
        },
        byMonth: data.data.monthly.map((m: { month: string; count: number; won: number; nmck: number }) => ({
          month: m.month,
          started: m.won,
          completed: Math.floor(m.won * 0.7),
          volume: m.nmck * 0.8,
        })),
        problems: [
          { contract: 'Контракт №123', issue: 'Задержка поставки', days: 15, severity: 'high' },
          { contract: 'Контракт №456', issue: 'Недокомплект', days: 7, severity: 'medium' },
          { contract: 'Контракт №789', issue: 'Документы', days: 3, severity: 'low' },
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

  if (loading || !stats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const { overview, byStage, byMonth, problems } = stats;
  const completionRate = overview.totalContracts > 0 
    ? (overview.completedContracts / overview.totalContracts) * 100 
    : 0;

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>📦 Отчет по реализации</h1>
            <p className={styles.pageDescription}>Исполнение контрактов</p>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            📥 Экспорт
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего контрактов</div>
          <div className={styles.statValue}>{overview.totalContracts}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>В работе: {overview.activeContracts}</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Завершено</div>
          <div className={styles.statValue}>{overview.completedContracts}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{completionRate.toFixed(1)}% от общего</div>
        </div>
        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statLabel}>Проблемных</div>
          <div className={styles.statValue}>{overview.problemContracts}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Требуют внимания</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Ср. срок</div>
          <div className={styles.statValue}>{overview.avgCompletionDays} дн</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>До завершения</div>
        </div>
      </div>

      {/* Объемы */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Объемы контрактов</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Общий объем</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCurrency(overview.totalVolume)}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '9999px', width: '100%' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Выполнено</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>{formatCurrency(overview.completedVolume)}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '9999px', width: `${(overview.completedVolume / overview.totalVolume) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Распределение по этапам</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(byStage).map(([stage, data]) => (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{stage}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{data.count} контрактов</div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  {formatCurrency(data.volume)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Динамика */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Динамика выполнения</h3>
        <table className={styles.table}>
          <thead>
              <tr>
                <th>Месяц</th>
                <th style={{ textAlign: 'right' }}>Начато</th>
                <th style={{ textAlign: 'right' }}>Завершено</th>
                <th style={{ textAlign: 'right' }}>Объем</th>
                <th style={{ textAlign: 'right' }}>% выполнения</th>
              </tr>
            </thead>
          <tbody>
              {byMonth.map((month) => {
                const rate = month.started > 0 ? (month.completed / month.started) * 100 : 0;
                return (
                  <tr key={month.month}>
                    <td>{month.month}</td>
                    <td style={{ textAlign: 'right' }}>{month.started}</td>
                    <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{month.completed}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(month.volume)}</td>
                    <td style={{ textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{rate.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Проблемные контракты */}
      {problems.length > 0 && (
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #ef4444' }}>
          <h3 className={styles.cardTitle} style={{ color: '#7f1d1d' }}>⚠️ Проблемные контракты</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {problems.map((problem, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '12px', padding: '1rem', border: '2px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{problem.contract}</span>
                  <span className={problem.severity === 'high' ? styles.badgeDanger : problem.severity === 'medium' ? styles.badgeWarning : styles.badgeSecondary}>
                    {problem.severity === 'high' ? 'Высокий' : problem.severity === 'medium' ? 'Средний' : 'Низкий'}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Проблема:</span> {problem.issue}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Просрочка:</span> {problem.days} дней
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #3b82f6' }}>
        <h3 className={styles.cardTitle} style={{ color: '#1e40af' }}>💡 Рекомендации</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#1e40af' }}>
          <li>• Процент выполнения {completionRate.toFixed(1)}% - {completionRate > 70 ? 'хороший показатель' : 'требует улучшения'}</li>
          <li>• Средний срок {overview.avgCompletionDays} дней - {overview.avgCompletionDays < 60 ? 'в пределах нормы' : 'можно ускорить'}</li>
          <li>• Проблемных контрактов: {overview.problemContracts} - {overview.problemContracts > 0 ? 'требуют немедленного внимания' : 'отлично!'}</li>
          <li>• Активных контрактов: {overview.activeContracts} - контролируйте сроки выполнения</li>
        </ul>
      </div>
    </div>
  );
}
