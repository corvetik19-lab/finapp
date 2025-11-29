'use client';

import { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { SummaryReportData } from '@/lib/tenders/summary-report-service';
import styles from './SummaryReport.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  initialData: SummaryReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';

export default function SummaryReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<SummaryReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'customers' | 'managers'>('overview');

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

      const response = await fetch(`/api/tenders/summary-report?${params}`);
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
    // Экспорт в CSV
    const rows = [
      ['Сводный отчёт по тендерам'],
      [],
      ['Показатель', 'Значение'],
      ['Всего тендеров', data.overview.totalTenders.toString()],
      ['Активных', data.overview.activeTenders.toString()],
      ['Выигранных', data.overview.wonTenders.toString()],
      ['Проигранных', data.overview.lostTenders.toString()],
      ['Процент побед', `${data.overview.winRate.toFixed(1)}%`],
      ['Общая НМЦК', data.overview.totalNmck.toString()],
      ['Сумма контрактов', data.overview.totalContractPrice.toString()],
      ['Экономия', data.overview.totalSavings.toString()],
      [],
      ['Воронка продаж'],
      ['Этап', 'Количество', 'НМЦК'],
      ...data.funnel.map(f => [f.stageName, f.count.toString(), f.totalNmck.toString()]),
      [],
      ['Топ заказчиков'],
      ['Заказчик', 'Тендеров', 'НМЦК', 'Выиграно'],
      ...data.topCustomers.map(c => [c.customer, c.count.toString(), c.totalNmck.toString(), c.wonCount.toString()]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Данные для графика динамики
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Всего тендеров',
        data: data.monthly.map(m => m.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Выиграно',
        data: data.monthly.map(m => m.wonCount),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [data.monthly]);

  // Данные для графика по типам
  const typeChartData = useMemo(() => ({
    labels: data.byType.slice(0, 6).map(t => t.typeName),
    datasets: [
      {
        data: data.byType.slice(0, 6).map(t => t.count),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#06b6d4',
        ],
        borderWidth: 0,
      },
    ],
  }), [data.byType]);

  // Данные для графика воронки
  const funnelChartData = useMemo(() => ({
    labels: data.funnel.map(f => f.stageName),
    datasets: [
      {
        label: 'Количество',
        data: data.funnel.map(f => f.count),
        backgroundColor: data.funnel.map(f => f.stageColor || '#6b7280'),
        borderRadius: 8,
      },
    ],
  }), [data.funnel]);

  const { overview, financial, timing } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📊</span>
            Сводный отчёт
          </h1>
          <p className={styles.subtitle}>Ключевые показатели эффективности тендерной деятельности</p>
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

      {/* Ключевые метрики */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.metricPrimary}`}>
          <div className={styles.metricIcon}>📋</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.totalTenders}</div>
            <div className={styles.metricLabel}>Всего тендеров</div>
            <div className={styles.metricSub}>Активных: {overview.activeTenders}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>🏆</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.wonTenders}</div>
            <div className={styles.metricLabel}>Выиграно</div>
            <div className={styles.metricSub}>
              Win Rate: <strong>{overview.winRate.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricInfo}`}>
          <div className={styles.metricIcon}>💰</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalNmck)}</div>
            <div className={styles.metricLabel}>Общая НМЦК</div>
            <div className={styles.metricSub}>Контракты: {formatCurrency(overview.totalContractPrice)}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricWarning}`}>
          <div className={styles.metricIcon}>💎</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalSavings)}</div>
            <div className={styles.metricLabel}>Экономия</div>
            <div className={styles.metricSub}>{overview.savingsPercent.toFixed(1)}% от НМЦК</div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>❌</div>
          <div>
            <div className={styles.secondaryValue}>{overview.lostTenders}</div>
            <div className={styles.secondaryLabel}>Проиграно</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>📊</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.avgDealSize)}</div>
            <div className={styles.secondaryLabel}>Средняя сделка</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>⏰</div>
          <div>
            <div className={styles.secondaryValue}>{timing.upcomingDeadlines}</div>
            <div className={styles.secondaryLabel}>Дедлайны на неделе</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fecaca', color: '#b91c1c' }}>🚨</div>
          <div>
            <div className={styles.secondaryValue}>{timing.overdueCount}</div>
            <div className={styles.secondaryLabel}>Просрочено</div>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Динамика
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'funnel' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('funnel')}
        >
          🎯 Воронка
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'customers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          🏢 Заказчики
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'managers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('managers')}
        >
          👥 Менеджеры
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.chartsGrid}>
            {/* Динамика по месяцам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📈 Динамика по месяцам</h3>
              <div className={styles.chartWrapper}>
                <Line
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* По типам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 По типам тендеров</h3>
              <div className={styles.chartWrapperSmall}>
                <Doughnut
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 12,
                          padding: 10,
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className={styles.typeList}>
                {data.byType.slice(0, 5).map((type) => (
                  <div key={type.typeId} className={styles.typeItem}>
                    <span className={styles.typeName}>{type.typeName}</span>
                    <span className={styles.typeCount}>{type.count} ({type.wonCount} выиграно)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* По площадкам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🏪 По площадкам</h3>
              <div className={styles.platformList}>
                {data.byPlatform.length > 0 ? (
                  data.byPlatform.map((platform, idx) => (
                    <div key={platform.platformId} className={styles.platformItem}>
                      <div className={styles.platformRank}>{idx + 1}</div>
                      <div className={styles.platformInfo}>
                        <div className={styles.platformName}>{platform.platformName}</div>
                        <div className={styles.platformStats}>
                          {platform.count} тендеров • {platform.wonCount} выиграно • {formatCurrency(platform.totalNmck)}
                        </div>
                      </div>
                      <div className={styles.platformProgress}>
                        <div
                          className={styles.platformBar}
                          style={{
                            width: `${data.byPlatform[0]?.count > 0 ? (platform.count / data.byPlatform[0].count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>Нет данных по площадкам</div>
                )}
              </div>
            </div>

            {/* Финансы */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💵 Финансовый баланс</h3>
              <div className={styles.financialGrid}>
                <div className={styles.financialItem}>
                  <div className={styles.financialLabel}>Доход (контракты)</div>
                  <div className={styles.financialValue} style={{ color: '#10b981' }}>
                    +{formatCurrency(financial.totalIncome)}
                  </div>
                </div>
                <div className={styles.financialItem}>
                  <div className={styles.financialLabel}>Обеспечения</div>
                  <div className={styles.financialValue} style={{ color: '#ef4444' }}>
                    -{formatCurrency(financial.totalExpenses)}
                  </div>
                </div>
                <div className={styles.financialDivider} />
                <div className={styles.financialItem}>
                  <div className={styles.financialLabel}>Чистая прибыль</div>
                  <div
                    className={styles.financialValueLarge}
                    style={{ color: financial.profit >= 0 ? '#10b981' : '#ef4444' }}
                  >
                    {financial.profit >= 0 ? '+' : ''}{formatCurrency(financial.profit)}
                  </div>
                  <div className={styles.financialSub}>
                    Маржа: {financial.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className={styles.funnelSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>🎯 Воронка продаж по этапам</h3>
              <div className={styles.chartWrapperLarge}>
                <Bar
                  data={funnelChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className={styles.funnelTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Этап</th>
                    <th style={{ textAlign: 'right' }}>Количество</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                    <th style={{ textAlign: 'right' }}>НМЦК</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.map(stage => (
                    <tr key={stage.stageId}>
                      <td>
                        <span
                          className={styles.stageIndicator}
                          style={{ background: stage.stageColor }}
                        />
                        {stage.stageName}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{stage.count}</td>
                      <td style={{ textAlign: 'right' }}>{stage.percent.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(stage.totalNmck)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className={styles.customersSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>🏢 Топ заказчиков</h3>
              {data.topCustomers.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Заказчик</th>
                      <th style={{ textAlign: 'right' }}>Тендеров</th>
                      <th style={{ textAlign: 'right' }}>Выиграно</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>НМЦК</th>
                      <th style={{ textAlign: 'right' }}>Ср. сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((customer, idx) => (
                      <tr key={customer.customer}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.customerName}>{customer.customer}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{customer.count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.wonBadge}>{customer.wonCount}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {customer.count > 0 ? ((customer.wonCount / customer.count) * 100).toFixed(0) : 0}%
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(customer.totalNmck)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {formatCurrency(customer.avgNmck)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет данных по заказчикам</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'managers' && (
          <div className={styles.managersSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>👥 Показатели менеджеров</h3>
              {data.topManagers.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Менеджер</th>
                      <th style={{ textAlign: 'right' }}>Тендеров</th>
                      <th style={{ textAlign: 'right' }}>Выиграно</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>НМЦК</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topManagers.map((manager, idx) => (
                      <tr key={manager.managerId}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.managerName}>{manager.managerName}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{manager.count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.wonBadge}>{manager.wonCount}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.winRateBadge}
                            style={{
                              background: manager.winRate >= 50 ? '#dcfce7' : manager.winRate >= 30 ? '#fef3c7' : '#fee2e2',
                              color: manager.winRate >= 50 ? '#166534' : manager.winRate >= 30 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {manager.winRate.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(manager.totalNmck)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет данных по менеджерам</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Аналитические выводы */}
      <div className={styles.insightsCard}>
        <h3 className={styles.insightsTitle}>💡 Аналитические выводы</h3>
        <div className={styles.insightsList}>
          {overview.totalTenders > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📊</span>
                <span>
                  Общий объём: <strong>{overview.totalTenders} тендеров</strong> на сумму{' '}
                  <strong>{formatCurrency(overview.totalNmck)}</strong>
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>
                  {overview.winRate >= 40 ? '🏆' : overview.winRate >= 20 ? '📈' : '⚠️'}
                </span>
                <span>
                  Win Rate <strong>{overview.winRate.toFixed(1)}%</strong> —{' '}
                  {overview.winRate >= 40
                    ? 'отличный показатель!'
                    : overview.winRate >= 20
                    ? 'хороший результат, есть потенциал'
                    : 'требует внимания'}
                </span>
              </div>
              {overview.totalSavings > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>💰</span>
                  <span>
                    Экономия при закупках: <strong>{formatCurrency(overview.totalSavings)}</strong> (
                    {overview.savingsPercent.toFixed(1)}% от НМЦК)
                  </span>
                </div>
              )}
              {data.topCustomers[0] && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🏢</span>
                  <span>
                    Ключевой заказчик: <strong>{data.topCustomers[0].customer}</strong> (
                    {data.topCustomers[0].count} тендеров, {formatCurrency(data.topCustomers[0].totalNmck)})
                  </span>
                </div>
              )}
              {data.topManagers[0] && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>👤</span>
                  <span>
                    Лучший менеджер: <strong>{data.topManagers[0].managerName}</strong> (
                    {data.topManagers[0].wonCount} побед, Win Rate {data.topManagers[0].winRate.toFixed(0)}%)
                  </span>
                </div>
              )}
              {timing.upcomingDeadlines > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏰</span>
                  <span>
                    <strong>{timing.upcomingDeadlines} тендеров</strong> с дедлайном на этой неделе
                  </span>
                </div>
              )}
              {timing.overdueCount > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{timing.overdueCount} просроченных</strong> тендеров требуют внимания!
                  </span>
                </div>
              )}
            </>
          )}
          {overview.totalTenders === 0 && (
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>📭</span>
              <span>Нет данных за выбранный период</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
