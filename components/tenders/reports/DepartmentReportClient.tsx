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
import type { DepartmentReportData } from '@/lib/tenders/department-report-service';
import styles from './DepartmentReport.module.css';

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
  initialData: DepartmentReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'specialists' | 'stages' | 'dynamics';

export default function DepartmentReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DepartmentReportData>(initialData);
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

      const response = await fetch(`/api/tenders/department-report?${params}`);
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
      ['Отчёт по тендерному отделу'],
      [],
      ['Показатель', 'Значение'],
      ['Всего тендеров', data.overview.totalTenders.toString()],
      ['Активных', data.overview.activeTenders.toString()],
      ['Выигранных', data.overview.wonTenders.toString()],
      ['Проигранных', data.overview.lostTenders.toString()],
      ['Win Rate', `${data.overview.winRate.toFixed(1)}%`],
      ['Общая НМЦК', data.overview.totalNmck.toString()],
      ['Ср. срок обработки', `${data.overview.avgProcessingDays} дней`],
      [],
      ['Специалисты'],
      ['Имя', 'Всего', 'Выиграно', 'Win Rate', 'НМЦК'],
      ...data.specialists.map(s => [s.name, s.totalTenders.toString(), s.wonTenders.toString(), `${s.winRate.toFixed(1)}%`, s.totalNmck.toString()]),
      [],
      ['По этапам'],
      ['Этап', 'Количество', '%', 'НМЦК'],
      ...data.stages.map(s => [s.stageName, s.count.toString(), `${s.percent.toFixed(1)}%`, s.totalNmck.toString()]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Данные для графика динамики
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Подано',
        data: data.monthly.map(m => m.submitted),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Выиграно',
        data: data.monthly.map(m => m.won),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Проиграно',
        data: data.monthly.map(m => m.lost),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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

  // Данные для графика загрузки
  const workloadChartData = useMemo(() => ({
    labels: ['Срочные', 'На неделе', 'След. неделя', 'Просрочено'],
    datasets: [
      {
        data: [data.workload.urgent, data.workload.thisWeek, data.workload.nextWeek, data.workload.overdue],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [data.workload]);

  const { overview, workload } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>👥</span>
            Отчёт по тендерному отделу
          </h1>
          <p className={styles.subtitle}>Эффективность работы отдела и специалистов</p>
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

        <div className={`${styles.metricCard} ${styles.metricDanger}`}>
          <div className={styles.metricIcon}>❌</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.lostTenders}</div>
            <div className={styles.metricLabel}>Проиграно</div>
            <div className={styles.metricSub}>Отменено: {overview.cancelledTenders}</div>
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
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>⏱️</div>
          <div>
            <div className={styles.secondaryValue}>{overview.avgProcessingDays} дн</div>
            <div className={styles.secondaryLabel}>Ср. срок обработки</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>👤</div>
          <div>
            <div className={styles.secondaryValue}>{data.specialists.length}</div>
            <div className={styles.secondaryLabel}>Специалистов</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>📊</div>
          <div>
            <div className={styles.secondaryValue}>{overview.tendersPerSpecialist}</div>
            <div className={styles.secondaryLabel}>Тендеров на человека</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: workload.overdue > 0 ? '#fee2e2' : '#d1fae5', color: workload.overdue > 0 ? '#dc2626' : '#059669' }}>
            {workload.overdue > 0 ? '🚨' : '✅'}
          </div>
          <div>
            <div className={styles.secondaryValue}>{workload.overdue}</div>
            <div className={styles.secondaryLabel}>Просрочено</div>
          </div>
        </div>
      </div>

      {/* Загрузка отдела */}
      {workload.total > 0 && (
        <div className={styles.workloadCard}>
          <h3 className={styles.workloadTitle}>⏰ Загрузка отдела</h3>
          <div className={styles.workloadGrid}>
            <div className={`${styles.workloadItem} ${styles.workloadUrgent}`}>
              <div className={styles.workloadValue}>{workload.urgent}</div>
              <div className={styles.workloadLabel}>Срочные (1-2 дня)</div>
            </div>
            <div className={`${styles.workloadItem} ${styles.workloadWeek}`}>
              <div className={styles.workloadValue}>{workload.thisWeek}</div>
              <div className={styles.workloadLabel}>На этой неделе</div>
            </div>
            <div className={`${styles.workloadItem} ${styles.workloadNext}`}>
              <div className={styles.workloadValue}>{workload.nextWeek}</div>
              <div className={styles.workloadLabel}>След. неделя</div>
            </div>
            <div className={`${styles.workloadItem} ${styles.workloadOverdue}`}>
              <div className={styles.workloadValue}>{workload.overdue}</div>
              <div className={styles.workloadLabel}>Просрочено</div>
            </div>
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
          className={`${styles.tab} ${activeTab === 'specialists' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('specialists')}
        >
          👥 Специалисты
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stages' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('stages')}
        >
          🎯 Этапы
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
            {/* По типам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 Эффективность по типам</h3>
              {data.byType.length > 0 ? (
                <div className={styles.typeList}>
                  {data.byType.map(type => (
                    <div key={type.typeId} className={styles.typeItem}>
                      <div className={styles.typeHeader}>
                        <span className={styles.typeName}>{type.typeName}</span>
                        <span className={styles.typeWinRate} style={{
                          color: type.winRate >= 50 ? '#10b981' : type.winRate >= 30 ? '#f59e0b' : '#ef4444'
                        }}>
                          {type.winRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className={styles.typeStats}>
                        <span>Всего: {type.count}</span>
                        <span style={{ color: '#10b981' }}>✓ {type.wonCount}</span>
                        <span style={{ color: '#ef4444' }}>✗ {type.lostCount}</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${type.winRate}%`,
                            background: type.winRate >= 50 ? '#10b981' : type.winRate >= 30 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных по типам</div>
              )}
            </div>

            {/* По площадкам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🏪 По площадкам</h3>
              {data.byPlatform.length > 0 ? (
                <div className={styles.platformList}>
                  {data.byPlatform.map((platform, idx) => (
                    <div key={platform.platformId} className={styles.platformItem}>
                      <div className={styles.platformRank}>{idx + 1}</div>
                      <div className={styles.platformInfo}>
                        <div className={styles.platformName}>{platform.platformName}</div>
                        <div className={styles.platformStats}>
                          {platform.count} тендеров • {platform.wonCount} выиграно • {platform.winRate.toFixed(0)}%
                        </div>
                      </div>
                      <div className={styles.platformNmck}>
                        {formatCurrency(platform.totalNmck)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных по площадкам</div>
              )}
            </div>

            {/* Распределение по этапам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🎯 Распределение по этапам</h3>
              {data.stages.length > 0 ? (
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
              ) : (
                <div className={styles.emptyState}>Нет данных по этапам</div>
              )}
            </div>

            {/* Загрузка (диаграмма) */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>⏰ Распределение дедлайнов</h3>
              {workload.total > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={workloadChartData}
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
                <div className={styles.emptyState}>Нет активных тендеров</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'specialists' && (
          <div className={styles.specialistsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>👥 Показатели специалистов</h3>
              {data.specialists.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Специалист</th>
                      <th>Роль</th>
                      <th style={{ textAlign: 'right' }}>Всего</th>
                      <th style={{ textAlign: 'right' }}>Активных</th>
                      <th style={{ textAlign: 'right' }}>Выиграно</th>
                      <th style={{ textAlign: 'right' }}>Проиграно</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>НМЦК</th>
                      <th style={{ textAlign: 'right' }}>Ср. срок</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.specialists.map((spec, idx) => (
                      <tr key={spec.id}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.specialistName}>{spec.name}</span>
                        </td>
                        <td>
                          <span className={styles.roleBadge}>{spec.role}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{spec.totalTenders}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.activeBadge}>{spec.activeTenders}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.wonBadge}>{spec.wonTenders}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.lostBadge}>{spec.lostTenders}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.winRateBadge}
                            style={{
                              background: spec.winRate >= 50 ? '#dcfce7' : spec.winRate >= 30 ? '#fef3c7' : '#fee2e2',
                              color: spec.winRate >= 50 ? '#166534' : spec.winRate >= 30 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {spec.winRate.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(spec.totalNmck)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {spec.avgProcessingDays} дн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет данных по специалистам</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stages' && (
          <div className={styles.stagesSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>🎯 Воронка тендерного отдела</h3>
              {data.stages.length > 0 ? (
                <>
                  <div className={styles.chartWrapperLarge}>
                    <Bar
                      data={{
                        labels: data.stages.map(s => s.stageName),
                        datasets: [{
                          label: 'Количество',
                          data: data.stages.map(s => s.count),
                          backgroundColor: data.stages.map(s => s.stageColor),
                          borderRadius: 8,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true } },
                      }}
                    />
                  </div>
                  <table className={styles.table} style={{ marginTop: '24px' }}>
                    <thead>
                      <tr>
                        <th>Этап</th>
                        <th style={{ textAlign: 'right' }}>Кол-во</th>
                        <th style={{ textAlign: 'right' }}>%</th>
                        <th style={{ textAlign: 'right' }}>Ср. дней</th>
                        <th style={{ textAlign: 'right' }}>НМЦК</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stages.map(stage => (
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
                          <td style={{ textAlign: 'right', color: '#64748b' }}>{stage.avgDaysInStage}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(stage.totalNmck)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className={styles.emptyState}>Нет данных по этапам</div>
              )}
            </div>

            {/* Причины проигрышей */}
            {data.lossReasons.length > 0 && (
              <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
                <h3 className={styles.chartTitle}>❌ Причины проигрышей</h3>
                <div className={styles.lossReasonsList}>
                  {data.lossReasons.map(reason => (
                    <div key={reason.reason} className={styles.lossReasonItem}>
                      <div className={styles.lossReasonHeader}>
                        <span className={styles.lossReasonName}>{reason.reason}</span>
                        <span className={styles.lossReasonPercent}>{reason.percent}%</span>
                      </div>
                      <div className={styles.lossReasonBar}>
                        <div
                          className={styles.lossReasonFill}
                          style={{ width: `${reason.percent}%` }}
                        />
                      </div>
                      <div className={styles.lossReasonCount}>{reason.count} случаев</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <th style={{ textAlign: 'right' }}>Подано</th>
                    <th style={{ textAlign: 'right' }}>Выиграно</th>
                    <th style={{ textAlign: 'right' }}>Проиграно</th>
                    <th style={{ textAlign: 'right' }}>Win Rate</th>
                    <th style={{ textAlign: 'right' }}>НМЦК</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map(month => (
                    <tr key={month.month}>
                      <td><strong>{month.monthLabel}</strong></td>
                      <td style={{ textAlign: 'right' }}>{month.submitted}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.wonBadge}>{month.won}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.lostBadge}>{month.lost}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={styles.winRateBadge}
                          style={{
                            background: month.winRate >= 50 ? '#dcfce7' : month.winRate >= 30 ? '#fef3c7' : '#fee2e2',
                            color: month.winRate >= 50 ? '#166534' : month.winRate >= 30 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {month.winRate.toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(month.totalNmck)}
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
          {overview.totalTenders > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>
                  {overview.winRate >= 40 ? '🏆' : overview.winRate >= 20 ? '📈' : '⚠️'}
                </span>
                <span>
                  Win Rate <strong>{overview.winRate.toFixed(1)}%</strong> —{' '}
                  {overview.winRate >= 40 ? 'отличный показатель!' : overview.winRate >= 20 ? 'хороший результат' : 'требует внимания'}
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>⏱️</span>
                <span>
                  Средний срок обработки: <strong>{overview.avgProcessingDays} дней</strong> —{' '}
                  {overview.avgProcessingDays <= 14 ? 'оптимально' : overview.avgProcessingDays <= 30 ? 'в норме' : 'можно ускорить'}
                </span>
              </div>
              {data.specialists.length > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>👤</span>
                  <span>
                    Лучший специалист: <strong>{data.specialists[0]?.name}</strong> ({data.specialists[0]?.wonTenders} побед, {data.specialists[0]?.winRate.toFixed(0)}%)
                  </span>
                </div>
              )}
              {workload.urgent > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{workload.urgent} срочных</strong> тендеров требуют внимания!
                  </span>
                </div>
              )}
              {workload.overdue > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏰</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{workload.overdue} просроченных</strong> тендеров!
                  </span>
                </div>
              )}
              {data.lossReasons[0] && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>📊</span>
                  <span>
                    Основная причина проигрышей: <strong>{data.lossReasons[0].reason}</strong> ({data.lossReasons[0].percent}%)
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
