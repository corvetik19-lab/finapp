'use client';

import { useState, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ManagerPerformanceReportData } from '@/lib/tenders/manager-performance-service';
import styles from './ManagerPerformance.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  initialData: ManagerPerformanceReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'ranking' | 'comparison';
type SortBy = 'winRate' | 'totalContracts' | 'totalTenders' | 'efficiency';

export default function ManagerPerformanceClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<ManagerPerformanceReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('winRate');

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} млрд ₽`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} млн ₽`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)} тыс ₽`;
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePeriodChange = async (newPeriod: Period) => {
    setPeriod(newPeriod);
    setLoading(true);

    try {
      const now = new Date();
      let dateFrom: string | undefined;

      if (newPeriod === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom = firstDay.toISOString().split('T')[0];
      } else if (newPeriod === 'quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFrom = quarterStart.toISOString().split('T')[0];
      } else if (newPeriod === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFrom = yearStart.toISOString().split('T')[0];
      }

      const params = new URLSearchParams({ company_id: companyId });
      if (dateFrom) params.append('date_from', dateFrom);

      const response = await fetch(`/api/tenders/manager-performance?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setData(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Отчёт по показателям менеджеров'],
      [],
      ['Менеджер', 'Тендеров', 'Выиграно', 'Проиграно', 'Активных', '% побед', 'Сумма контрактов', 'НМЦК', 'Ср. сделка', 'Экономия %'],
      ...data.managers.map(m => [
        m.name,
        m.totalTenders.toString(),
        m.wonTenders.toString(),
        m.lostTenders.toString(),
        m.activeTenders.toString(),
        m.winRate.toFixed(1) + '%',
        m.totalContractPrice.toString(),
        m.totalNmck.toString(),
        m.avgDealSize.toString(),
        m.avgSavings.toFixed(1) + '%',
      ]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Сортировка менеджеров
  const sortedManagers = useMemo(() => {
    return [...data.managers].sort((a, b) => {
      switch (sortBy) {
        case 'totalContracts': return b.totalContractPrice - a.totalContractPrice;
        case 'totalTenders': return b.totalTenders - a.totalTenders;
        case 'efficiency': return b.efficiency - a.efficiency;
        default: return b.winRate - a.winRate;
      }
    });
  }, [data.managers, sortBy]);

  // Топ-3 менеджера
  const topManagers = sortedManagers.slice(0, 3);

  // Данные для графика по менеджерам
  const managersChartData = useMemo(() => ({
    labels: sortedManagers.slice(0, 10).map(m => m.name.split(' ')[0]),
    datasets: [
      {
        label: 'Выиграно',
        data: sortedManagers.slice(0, 10).map(m => m.wonTenders),
        backgroundColor: '#10b981',
      },
      {
        label: 'Проиграно',
        data: sortedManagers.slice(0, 10).map(m => m.lostTenders),
        backgroundColor: '#ef4444',
      },
      {
        label: 'В работе',
        data: sortedManagers.slice(0, 10).map(m => m.activeTenders),
        backgroundColor: '#3b82f6',
      },
    ],
  }), [sortedManagers]);

  // Данные для диаграммы распределения контрактов
  const contractsDistributionData = useMemo(() => ({
    labels: sortedManagers.slice(0, 5).map(m => m.name.split(' ')[0]),
    datasets: [
      {
        data: sortedManagers.slice(0, 5).map(m => m.totalContractPrice),
        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [sortedManagers]);

  // Данные для графика % побед
  const winRateChartData = useMemo(() => ({
    labels: sortedManagers.slice(0, 10).map(m => m.name.split(' ')[0]),
    datasets: [
      {
        label: '% побед',
        data: sortedManagers.slice(0, 10).map(m => m.winRate),
        backgroundColor: sortedManagers.slice(0, 10).map(m => 
          m.winRate >= 50 ? '#10b981' : m.winRate >= 30 ? '#f59e0b' : '#ef4444'
        ),
      },
    ],
  }), [sortedManagers]);

  const { overview } = data;

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.rankGold;
    if (rank === 2) return styles.rankSilver;
    if (rank === 3) return styles.rankBronze;
    return '';
  };

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>👤</span>
            Показатели менеджеров
          </h1>
          <p className={styles.subtitle}>Индивидуальная эффективность и KPI</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodButtons}>
            {(['month', 'quarter', 'year', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
                disabled={loading}
              >
                {p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : p === 'year' ? 'Год' : 'Всё время'}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className={styles.exportBtn}>
            <span className={styles.btnIcon}>📥</span>
            Экспорт
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {/* Ключевые метрики команды */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.metricPrimary}`}>
          <div className={styles.metricIcon}>👥</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.totalManagers}</div>
            <div className={styles.metricLabel}>Менеджеров</div>
            <div className={styles.metricSub}>{overview.totalTenders} тендеров</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>🏆</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.totalWon}</div>
            <div className={styles.metricLabel}>Выиграно</div>
            <div className={styles.metricSub}>{overview.avgWinRate.toFixed(1)}% в среднем</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricInfo}`}>
          <div className={styles.metricIcon}>💰</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalContractSum)}</div>
            <div className={styles.metricLabel}>Сумма контрактов</div>
            <div className={styles.metricSub}>НМЦК: {formatCurrency(overview.totalNmck)}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.avgSavings > 0 ? styles.metricSuccess : ''}`}>
          <div className={styles.metricIcon}>📉</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.avgSavings.toFixed(1)}%</div>
            <div className={styles.metricLabel}>Экономия</div>
            <div className={styles.metricSub}>От НМЦК</div>
          </div>
        </div>
      </div>

      {/* Топ-3 менеджера */}
      {topManagers.length > 0 && (
        <div className={styles.topManagersSection}>
          <h3 className={styles.sectionTitle}>🏆 Лидеры рейтинга</h3>
          <div className={styles.topManagersGrid}>
            {topManagers.map((manager, index) => (
              <div 
                key={manager.id} 
                className={`${styles.topManagerCard} ${getRankClass(index + 1)}`}
              >
                <div className={styles.topManagerHeader}>
                  <div className={styles.topManagerRank}>{getRankEmoji(index + 1)}</div>
                  <div className={styles.topManagerInfo}>
                    <div className={styles.topManagerName}>{manager.name}</div>
                    <div className={styles.topManagerPosition}>{manager.position || 'Менеджер'}</div>
                  </div>
                </div>
                <div className={styles.topManagerStats}>
                  <div className={styles.topManagerStat}>
                    <span className={styles.statLabel}>Тендеров</span>
                    <span className={styles.statValue}>{manager.totalTenders}</span>
                  </div>
                  <div className={styles.topManagerStat}>
                    <span className={styles.statLabel}>Выиграно</span>
                    <span className={styles.statValue} style={{ color: '#10b981' }}>{manager.wonTenders}</span>
                  </div>
                  <div className={styles.topManagerStat}>
                    <span className={styles.statLabel}>% побед</span>
                    <span className={styles.statValue} style={{ color: '#3b82f6' }}>{manager.winRate.toFixed(1)}%</span>
                  </div>
                  <div className={styles.topManagerStat}>
                    <span className={styles.statLabel}>Контракты</span>
                    <span className={styles.statValue} style={{ color: '#8b5cf6' }}>{formatCurrency(manager.totalContractPrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Обзор
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'ranking' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          🏅 Рейтинг
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'comparison' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          📈 Сравнение
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* График по менеджерам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 Результаты по менеджерам</h3>
              {sortedManagers.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <Bar
                    data={managersChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                      },
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* Распределение контрактов */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💰 Распределение контрактов</h3>
              {sortedManagers.length > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={contractsDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.raw as number;
                              return ` ${formatCurrency(value)}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* % побед */}
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📈 Процент побед по менеджерам</h3>
              {sortedManagers.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <Bar
                    data={winRateChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => ` ${(context.raw as number).toFixed(1)}%`,
                          },
                        },
                      },
                      scales: {
                        x: { beginAtZero: true, max: 100 },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Рейтинг менеджеров ({sortedManagers.length})</h3>
              <div className={styles.sortButtons}>
                <span className={styles.sortLabel}>Сортировка:</span>
                {([
                  { key: 'winRate', label: 'По % побед' },
                  { key: 'totalContracts', label: 'По контрактам' },
                  { key: 'totalTenders', label: 'По количеству' },
                  { key: 'efficiency', label: 'По эффективности' },
                ] as { key: SortBy; label: string }[]).map(s => (
                  <button
                    key={s.key}
                    className={`${styles.sortBtn} ${sortBy === s.key ? styles.sortBtnActive : ''}`}
                    onClick={() => setSortBy(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {sortedManagers.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Менеджер</th>
                    <th style={{ textAlign: 'right' }}>Тендеров</th>
                    <th style={{ textAlign: 'right' }}>Выиграно</th>
                    <th style={{ textAlign: 'right' }}>Проиграно</th>
                    <th style={{ textAlign: 'right' }}>В работе</th>
                    <th style={{ textAlign: 'right' }}>% побед</th>
                    <th style={{ textAlign: 'right' }}>Контракты</th>
                    <th style={{ textAlign: 'right' }}>Ср. сделка</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedManagers.map((manager, index) => (
                    <tr key={manager.id} className={index < 3 ? styles.topRow : ''}>
                      <td>
                        <span className={styles.rankBadge}>
                          {index < 3 ? getRankEmoji(index + 1) : index + 1}
                        </span>
                      </td>
                      <td>
                        <div className={styles.managerCell}>
                          <strong className={styles.managerName}>{manager.name}</strong>
                          {manager.position && (
                            <span className={styles.managerPosition}>{manager.position}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{manager.totalTenders}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.wonBadge}>{manager.wonTenders}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.lostBadge}>{manager.lostTenders}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.activeBadge}>{manager.activeTenders}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`${styles.winRateBadge} ${
                          manager.winRate >= 50 ? styles.winRateHigh :
                          manager.winRate >= 30 ? styles.winRateMedium : styles.winRateLow
                        }`}>
                          {manager.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(manager.totalContractPrice)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {formatCurrency(manager.avgDealSize)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👤</span>
                <p>Нет данных по менеджерам</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className={styles.comparisonGrid}>
            {sortedManagers.slice(0, 6).map(manager => (
              <div key={manager.id} className={styles.comparisonCard}>
                <div className={styles.comparisonHeader}>
                  <div className={styles.comparisonRank}>{getRankEmoji(manager.rank)}</div>
                  <div className={styles.comparisonName}>{manager.name}</div>
                </div>
                
                <div className={styles.comparisonMetrics}>
                  <div className={styles.comparisonMetric}>
                    <div className={styles.comparisonLabel}>% побед</div>
                    <div className={styles.comparisonBar}>
                      <div 
                        className={styles.comparisonBarFill}
                        style={{ 
                          width: `${manager.winRate}%`,
                          background: manager.winRate >= 50 ? '#10b981' : manager.winRate >= 30 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <div className={styles.comparisonValue}>{manager.winRate.toFixed(1)}%</div>
                  </div>

                  <div className={styles.comparisonMetric}>
                    <div className={styles.comparisonLabel}>Тендеров</div>
                    <div className={styles.comparisonBar}>
                      <div 
                        className={styles.comparisonBarFill}
                        style={{ 
                          width: `${(manager.totalTenders / Math.max(...sortedManagers.map(m => m.totalTenders))) * 100}%`,
                          background: '#3b82f6'
                        }}
                      />
                    </div>
                    <div className={styles.comparisonValue}>{manager.totalTenders}</div>
                  </div>

                  <div className={styles.comparisonMetric}>
                    <div className={styles.comparisonLabel}>Контракты</div>
                    <div className={styles.comparisonBar}>
                      <div 
                        className={styles.comparisonBarFill}
                        style={{ 
                          width: `${(manager.totalContractPrice / Math.max(...sortedManagers.map(m => m.totalContractPrice))) * 100}%`,
                          background: '#8b5cf6'
                        }}
                      />
                    </div>
                    <div className={styles.comparisonValue}>{formatCurrency(manager.totalContractPrice)}</div>
                  </div>
                </div>

                <div className={styles.comparisonFooter}>
                  <span>✅ {manager.wonTenders}</span>
                  <span>❌ {manager.lostTenders}</span>
                  <span>⏳ {manager.activeTenders}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Рекомендации */}
      <div className={styles.insightsGrid}>
        <div className={`${styles.insightsCard} ${styles.insightsSuccess}`}>
          <h3 className={styles.insightsTitle}>✅ Лучшие показатели</h3>
          <div className={styles.insightsList}>
            {overview.bestManagerName && (
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>🏆</span>
                <span><strong>{overview.bestManagerName}</strong> — лидер по % побед ({overview.bestWinRate.toFixed(1)}%)</span>
              </div>
            )}
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>📊</span>
              <span>Средний % побед команды: <strong>{overview.avgWinRate.toFixed(1)}%</strong></span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>💰</span>
              <span>Общая сумма контрактов: <strong>{formatCurrency(overview.totalContractSum)}</strong></span>
            </div>
          </div>
        </div>

        <div className={`${styles.insightsCard} ${styles.insightsWarning}`}>
          <h3 className={styles.insightsTitle}>⚠️ Требует внимания</h3>
          <div className={styles.insightsList}>
            {sortedManagers.filter(m => m.winRate < 30).length > 0 && (
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📉</span>
                <span><strong>{sortedManagers.filter(m => m.winRate < 30).length}</strong> менеджеров с низким % побед (&lt;30%)</span>
              </div>
            )}
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>📚</span>
              <span>Рекомендуется обмен опытом между лидерами и новичками</span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>🔍</span>
              <span>Проведите анализ причин проигранных тендеров</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
