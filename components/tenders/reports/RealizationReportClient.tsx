'use client';

import { useState, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
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
import type { RealizationReportData } from '@/lib/tenders/realization-report-service';
import styles from './RealizationReport.module.css';

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
  initialData: RealizationReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'executors' | 'customers' | 'dynamics';

export default function RealizationReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<RealizationReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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

      const response = await fetch(`/api/tenders/realization-report?${params}`);
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
      ['Отчёт по реализации'],
      [],
      ['Показатель', 'Значение'],
      ['Всего контрактов', data.overview.totalContracts.toString()],
      ['Активных', data.overview.activeContracts.toString()],
      ['Завершённых', data.overview.completedContracts.toString()],
      ['Проблемных', data.overview.problemContracts.toString()],
      ['% выполнения', `${data.overview.completionRate.toFixed(1)}%`],
      ['Общая сумма', data.overview.totalContractValue.toString()],
      ['Выполнено на сумму', data.overview.completedValue.toString()],
      ['Ср. срок выполнения', `${data.overview.avgCompletionDays} дней`],
      [],
      ['Исполнители'],
      ['Имя', 'Всего', 'Активных', 'Завершено', '% выполнения', 'Сумма'],
      ...data.executors.map(e => [e.name, e.totalContracts.toString(), e.activeContracts.toString(), e.completedContracts.toString(), `${e.completionRate.toFixed(1)}%`, e.totalValue.toString()]),
      [],
      ['По этапам'],
      ['Этап', 'Количество', '%', 'Сумма'],
      ...data.stages.map(s => [s.stageName, s.count.toString(), `${s.percent.toFixed(1)}%`, s.totalValue.toString()]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `realization-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Данные для графика динамики
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Начато',
        data: data.monthly.map(m => m.started),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Завершено',
        data: data.monthly.map(m => m.completed),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [data.monthly]);

  // Данные для графика по этапам
  const stagesChartData = useMemo(() => ({
    labels: data.stages.map(s => s.stageName),
    datasets: [
      {
        data: data.stages.map(s => s.count),
        backgroundColor: data.stages.map(s => s.stageColor || '#6b7280'),
        borderWidth: 0,
      },
    ],
  }), [data.stages]);

  // Данные для графика выполнения
  const completionChartData = useMemo(() => ({
    labels: ['Завершено', 'В работе', 'Проблемные'],
    datasets: [
      {
        data: [
          data.overview.completedContracts,
          data.overview.activeContracts - data.overview.problemContracts,
          data.overview.problemContracts,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [data.overview]);

  const { overview, timing } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📦</span>
            Отчёт по реализации
          </h1>
          <p className={styles.subtitle}>Исполнение контрактов и контроль сроков</p>
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
            <div className={styles.metricValue}>{overview.totalContracts}</div>
            <div className={styles.metricLabel}>Всего контрактов</div>
            <div className={styles.metricSub}>В работе: {overview.activeContracts}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>✅</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.completedContracts}</div>
            <div className={styles.metricLabel}>Завершено</div>
            <div className={styles.metricSub}>
              <strong>{overview.completionRate.toFixed(1)}%</strong> выполнено
            </div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.problemContracts > 0 ? styles.metricDanger : styles.metricSuccess}`}>
          <div className={styles.metricIcon}>{overview.problemContracts > 0 ? '⚠️' : '👍'}</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.problemContracts}</div>
            <div className={styles.metricLabel}>Проблемных</div>
            <div className={styles.metricSub}>
              {overview.problemContracts > 0 ? 'Требуют внимания' : 'Всё в порядке'}
            </div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricInfo}`}>
          <div className={styles.metricIcon}>💰</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalContractValue)}</div>
            <div className={styles.metricLabel}>Общая сумма</div>
            <div className={styles.metricSub}>Выполнено: {formatCurrency(overview.completedValue)}</div>
          </div>
        </div>
      </div>

      {/* Прогресс выполнения */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <h3 className={styles.progressTitle}>📊 Прогресс выполнения</h3>
          <span className={styles.progressPercent}>{overview.completionRate.toFixed(1)}%</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ 
                width: `${overview.completionRate}%`,
                background: overview.completionRate >= 70 ? '#10b981' : overview.completionRate >= 40 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>
        <div className={styles.progressStats}>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#10b981' }}></span>
            <span>Завершено: {overview.completedContracts}</span>
          </div>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#3b82f6' }}></span>
            <span>В работе: {overview.activeContracts - overview.problemContracts}</span>
          </div>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#ef4444' }}></span>
            <span>Проблемные: {overview.problemContracts}</span>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>⏱️</div>
          <div>
            <div className={styles.secondaryValue}>{overview.avgCompletionDays} дн</div>
            <div className={styles.secondaryLabel}>Ср. срок выполнения</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>👤</div>
          <div>
            <div className={styles.secondaryValue}>{data.executors.length}</div>
            <div className={styles.secondaryLabel}>Исполнителей</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>🏢</div>
          <div>
            <div className={styles.secondaryValue}>{data.customers.length}</div>
            <div className={styles.secondaryLabel}>Заказчиков</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: timing.onTimePercent >= 80 ? '#d1fae5' : '#fee2e2', color: timing.onTimePercent >= 80 ? '#059669' : '#dc2626' }}>
            {timing.onTimePercent >= 80 ? '✅' : '⚠️'}
          </div>
          <div>
            <div className={styles.secondaryValue}>{timing.onTimePercent.toFixed(0)}%</div>
            <div className={styles.secondaryLabel}>В срок</div>
          </div>
        </div>
      </div>

      {/* Предупреждения о дедлайнах */}
      {(data.upcomingDeadlines.length > 0 || data.problemContracts.length > 0) && (
        <div className={styles.alertsGrid}>
          {data.upcomingDeadlines.length > 0 && (
            <div className={styles.alertCard}>
              <h3 className={styles.alertTitle}>⏰ Скоро дедлайны ({data.upcomingDeadlines.length})</h3>
              <div className={styles.alertList}>
                {data.upcomingDeadlines.slice(0, 5).map(item => (
                  <div key={item.id} className={`${styles.alertItem} ${styles[`alert${item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}`]}`}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={`${styles.alertBadge} ${styles[`badge${item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}`]}`}>
                        {item.daysLeft === 0 ? 'Сегодня' : item.daysLeft === 1 ? 'Завтра' : `${item.daysLeft} дн`}
                      </span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.problemContracts.length > 0 && (
            <div className={`${styles.alertCard} ${styles.alertDanger}`}>
              <h3 className={styles.alertTitle}>🚨 Просрочено ({data.problemContracts.length})</h3>
              <div className={styles.alertList}>
                {data.problemContracts.slice(0, 5).map(item => (
                  <div key={item.id} className={styles.alertItem}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={`${styles.alertBadge} ${styles.badgeCritical}`}>
                        +{item.daysOverdue} дн
                      </span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          className={`${styles.tab} ${activeTab === 'executors' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('executors')}
        >
          👥 Исполнители
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'customers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          🏢 Заказчики
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'dynamics' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('dynamics')}
        >
          📈 Динамика
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* По этапам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🎯 Распределение по этапам</h3>
              {data.stages.length > 0 ? (
                <>
                  <div className={styles.chartWrapperSmall}>
                    <Doughnut
                      data={stagesChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
                          },
                        },
                      }}
                    />
                  </div>
                  <div className={styles.stagesList}>
                    {data.stages.map(stage => (
                      <div key={stage.stageId} className={styles.stageItem}>
                        <span
                          className={styles.stageIndicator}
                          style={{ background: stage.stageColor }}
                        />
                        <span className={styles.stageName}>{stage.stageName}</span>
                        <span className={styles.stageCount}>{stage.count}</span>
                        <span className={styles.stageValue}>{formatCurrency(stage.totalValue)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>Нет данных по этапам</div>
              )}
            </div>

            {/* Статус выполнения */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📈 Статус контрактов</h3>
              {overview.totalContracts > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={completionChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>Нет активных контрактов</div>
              )}
            </div>

            {/* Финансы */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💰 Финансовый прогресс</h3>
              <div className={styles.financeStats}>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Общая сумма контрактов</div>
                  <div className={styles.financeValue}>{formatCurrency(overview.totalContractValue)}</div>
                  <div className={styles.financeBar}>
                    <div className={styles.financeBarFill} style={{ width: '100%', background: '#3b82f6' }} />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Выполнено</div>
                  <div className={styles.financeValue} style={{ color: '#10b981' }}>{formatCurrency(overview.completedValue)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: overview.totalContractValue > 0 ? `${(overview.completedValue / overview.totalContractValue) * 100}%` : '0%', 
                        background: '#10b981' 
                      }} 
                    />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Осталось выполнить</div>
                  <div className={styles.financeValue} style={{ color: '#f59e0b' }}>{formatCurrency(overview.remainingValue)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: overview.totalContractValue > 0 ? `${(overview.remainingValue / overview.totalContractValue) * 100}%` : '0%', 
                        background: '#f59e0b' 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Сроки */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>⏱️ Статистика по срокам</h3>
              <div className={styles.timingStats}>
                <div className={styles.timingStat}>
                  <div className={styles.timingValue}>{timing.avgDaysToComplete}</div>
                  <div className={styles.timingLabel}>Ср. дней</div>
                </div>
                <div className={styles.timingStat}>
                  <div className={styles.timingValue}>{timing.minDays}</div>
                  <div className={styles.timingLabel}>Мин. дней</div>
                </div>
                <div className={styles.timingStat}>
                  <div className={styles.timingValue}>{timing.maxDays}</div>
                  <div className={styles.timingLabel}>Макс. дней</div>
                </div>
                <div className={styles.timingStat}>
                  <div className={styles.timingValue} style={{ color: '#10b981' }}>{timing.onTimeCount}</div>
                  <div className={styles.timingLabel}>В срок</div>
                </div>
                <div className={styles.timingStat}>
                  <div className={styles.timingValue} style={{ color: '#ef4444' }}>{timing.lateCount}</div>
                  <div className={styles.timingLabel}>Просрочено</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'executors' && (
          <div className={styles.executorsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>👥 Показатели исполнителей</h3>
              {data.executors.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Исполнитель</th>
                      <th>Роль</th>
                      <th style={{ textAlign: 'right' }}>Всего</th>
                      <th style={{ textAlign: 'right' }}>Активных</th>
                      <th style={{ textAlign: 'right' }}>Завершено</th>
                      <th style={{ textAlign: 'right' }}>Проблемных</th>
                      <th style={{ textAlign: 'right' }}>% выполнения</th>
                      <th style={{ textAlign: 'right' }}>Сумма</th>
                      <th style={{ textAlign: 'right' }}>Ср. срок</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.executors.map((exec, idx) => (
                      <tr key={exec.id}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.executorName}>{exec.name}</span>
                        </td>
                        <td>
                          <span className={styles.roleBadge}>{exec.role}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{exec.totalContracts}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.activeBadge}>{exec.activeContracts}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.completedBadge}>{exec.completedContracts}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {exec.problemContracts > 0 ? (
                            <span className={styles.problemBadge}>{exec.problemContracts}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.rateBadge}
                            style={{
                              background: exec.completionRate >= 70 ? '#dcfce7' : exec.completionRate >= 40 ? '#fef3c7' : '#fee2e2',
                              color: exec.completionRate >= 70 ? '#166534' : exec.completionRate >= 40 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {exec.completionRate.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(exec.totalValue)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {exec.avgDays} дн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет данных по исполнителям</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className={styles.customersSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>🏢 Контракты по заказчикам</h3>
              {data.customers.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Заказчик</th>
                      <th style={{ textAlign: 'right' }}>Всего</th>
                      <th style={{ textAlign: 'right' }}>Активных</th>
                      <th style={{ textAlign: 'right' }}>Завершено</th>
                      <th style={{ textAlign: 'right' }}>Общая сумма</th>
                      <th style={{ textAlign: 'right' }}>Выполнено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((customer, idx) => (
                      <tr key={customer.name}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.customerName}>{customer.name}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{customer.count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.activeBadge}>{customer.activeCount}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.completedBadge}>{customer.completedCount}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(customer.totalValue)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                          {formatCurrency(customer.completedValue)}
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

        {activeTab === 'dynamics' && (
          <div className={styles.dynamicsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📈 Динамика по месяцам</h3>
              <div className={styles.chartWrapperLarge}>
                <Line
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>

            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📅 Детализация по месяцам</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Месяц</th>
                    <th style={{ textAlign: 'right' }}>Начато</th>
                    <th style={{ textAlign: 'right' }}>Завершено</th>
                    <th style={{ textAlign: 'right' }}>% выполнения</th>
                    <th style={{ textAlign: 'right' }}>Общая сумма</th>
                    <th style={{ textAlign: 'right' }}>Выполнено</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map(month => (
                    <tr key={month.month}>
                      <td><strong>{month.monthLabel}</strong></td>
                      <td style={{ textAlign: 'right' }}>{month.started}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.completedBadge}>{month.completed}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={styles.rateBadge}
                          style={{
                            background: month.completionRate >= 70 ? '#dcfce7' : month.completionRate >= 40 ? '#fef3c7' : '#fee2e2',
                            color: month.completionRate >= 70 ? '#166534' : month.completionRate >= 40 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {month.completionRate.toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(month.totalValue)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                        {formatCurrency(month.completedValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Аналитические выводы */}
      <div className={styles.insightsCard}>
        <h3 className={styles.insightsTitle}>💡 Аналитические выводы</h3>
        <div className={styles.insightsList}>
          {overview.totalContracts > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>
                  {overview.completionRate >= 70 ? '🏆' : overview.completionRate >= 40 ? '📈' : '⚠️'}
                </span>
                <span>
                  Процент выполнения <strong>{overview.completionRate.toFixed(1)}%</strong> —{' '}
                  {overview.completionRate >= 70 ? 'отличный показатель!' : overview.completionRate >= 40 ? 'хороший результат' : 'требует внимания'}
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>⏱️</span>
                <span>
                  Средний срок выполнения: <strong>{overview.avgCompletionDays} дней</strong> —{' '}
                  {overview.avgCompletionDays <= 30 ? 'быстро' : overview.avgCompletionDays <= 60 ? 'в норме' : 'можно ускорить'}
                </span>
              </div>
              {data.executors.length > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>👤</span>
                  <span>
                    Лучший исполнитель: <strong>{data.executors[0]?.name}</strong> ({data.executors[0]?.completedContracts} завершено, {data.executors[0]?.completionRate.toFixed(0)}%)
                  </span>
                </div>
              )}
              {overview.problemContracts > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{overview.problemContracts} просроченных</strong> контрактов требуют немедленного внимания!
                  </span>
                </div>
              )}
              {data.upcomingDeadlines.length > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏰</span>
                  <span style={{ color: '#d97706' }}>
                    <strong>{data.upcomingDeadlines.length} контрактов</strong> со скорым дедлайном
                  </span>
                </div>
              )}
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>💰</span>
                <span>
                  Осталось выполнить на <strong>{formatCurrency(overview.remainingValue)}</strong>
                </span>
              </div>
            </>
          )}
          {overview.totalContracts === 0 && (
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
