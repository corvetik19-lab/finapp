'use client';

import { useState, useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
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
import type { GuaranteesReportData } from '@/lib/tenders/guarantees-report-service';
import styles from './GuaranteesReport.module.css';

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
  initialData: GuaranteesReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'all' | 'expiring';
type Filter = 'all' | 'active' | 'expiring' | 'expired';

export default function GuaranteesReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<GuaranteesReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<Filter>('all');

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

      const response = await fetch(`/api/tenders/guarantees-report?${params}`);
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
      ['Отчёт по банковским гарантиям'],
      [],
      ['Показатель', 'Значение'],
      ['Всего гарантий', data.overview.totalCount.toString()],
      ['Общая сумма', data.overview.totalAmount.toString()],
      ['Активных', data.overview.activeCount.toString()],
      ['Истекают скоро', data.overview.expiringCount.toString()],
      ['Истекли', data.overview.expiredCount.toString()],
      [],
      ['Гарантии'],
      ['Номер закупки', 'Заказчик', 'Тип', 'Сумма', 'Начало', 'Окончание', 'Дней осталось', 'Статус'],
      ...data.guarantees.map(g => [
        g.purchaseNumber,
        g.customer,
        g.type === 'application' ? 'Заявка' : g.type === 'contract' ? 'Контракт' : 'Гарантия',
        g.amount.toString(),
        g.startDate || '',
        g.endDate || '',
        g.daysLeft.toString(),
        g.status,
      ]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guarantees-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      application: 'Обеспечение заявки',
      contract: 'Обеспечение контракта',
      warranty: 'Гарантийные обязательства',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Активна',
      expiring: 'Истекает',
      expired: 'Истекла',
      returned: 'Возвращена',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      active: styles.statusActive,
      expiring: styles.statusExpiring,
      expired: styles.statusExpired,
      returned: styles.statusReturned,
    };
    return classes[status] || '';
  };

  // Фильтрация гарантий
  const filteredGuarantees = useMemo(() => {
    return data.guarantees.filter(g => {
      if (filter === 'active') return g.status === 'active';
      if (filter === 'expiring') return g.status === 'expiring' || (g.status === 'active' && g.daysLeft <= 30);
      if (filter === 'expired') return g.status === 'expired';
      return true;
    });
  }, [data.guarantees, filter]);

  // Данные для диаграммы по типам
  const typeChartData = useMemo(() => ({
    labels: data.byType.map(t => t.label),
    datasets: [
      {
        data: data.byType.map(t => t.amount),
        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  }), [data.byType]);

  // Данные для диаграммы по статусам
  const statusChartData = useMemo(() => ({
    labels: ['Активные', 'Истекают', 'Истекшие'],
    datasets: [
      {
        data: [
          data.overview.activeCount,
          data.overview.expiringCount,
          data.overview.expiredCount,
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [data.overview]);

  // Данные для графика по месяцам
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Новые гарантии',
        data: data.monthly.map(m => m.newAmount),
        backgroundColor: '#3b82f6',
      },
    ],
  }), [data.monthly]);

  const { overview } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>🛡️</span>
            Банковские гарантии
          </h1>
          <p className={styles.subtitle}>Обеспечение заявок и контрактов</p>
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
            <div className={styles.metricValue}>{overview.totalCount}</div>
            <div className={styles.metricLabel}>Всего гарантий</div>
            <div className={styles.metricSub}>{formatCurrency(overview.totalAmount)}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>✅</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.activeCount}</div>
            <div className={styles.metricLabel}>Активных</div>
            <div className={styles.metricSub}>{formatCurrency(overview.activeAmount)}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.expiringCount > 0 ? styles.metricWarning : styles.metricSuccess}`}>
          <div className={styles.metricIcon}>{overview.expiringCount > 0 ? '⚠️' : '👍'}</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.expiringCount}</div>
            <div className={styles.metricLabel}>Истекают</div>
            <div className={styles.metricSub}>{overview.expiringCount > 0 ? formatCurrency(overview.expiringAmount) : 'Нет срочных'}</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.expiredCount > 0 ? styles.metricDanger : styles.metricSuccess}`}>
          <div className={styles.metricIcon}>{overview.expiredCount > 0 ? '❌' : '✅'}</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{overview.expiredCount}</div>
            <div className={styles.metricLabel}>Истекли</div>
            <div className={styles.metricSub}>{overview.expiredCount > 0 ? formatCurrency(overview.expiredAmount) : 'Всё в порядке'}</div>
          </div>
        </div>
      </div>

      {/* Структура обеспечения */}
      <div className={styles.structureCard}>
        <h3 className={styles.structureTitle}>📊 Структура обеспечения</h3>
        <div className={styles.structureGrid}>
          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#3b82f6' }}></span>
              <span className={styles.structureName}>Обеспечение заявок</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.applicationSecurityTotal)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalAmount > 0 ? `${(overview.applicationSecurityTotal / overview.totalAmount) * 100}%` : '0%',
                  background: '#3b82f6'
                }} 
              />
            </div>
          </div>

          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#8b5cf6' }}></span>
              <span className={styles.structureName}>Обеспечение контрактов</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.contractSecurityTotal)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalAmount > 0 ? `${(overview.contractSecurityTotal / overview.totalAmount) * 100}%` : '0%',
                  background: '#8b5cf6'
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>📝</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.applicationSecurityTotal)}</div>
            <div className={styles.secondaryLabel}>Обеспечение заявок</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>📄</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.contractSecurityTotal)}</div>
            <div className={styles.secondaryLabel}>Обеспечение контрактов</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>💰</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.avgGuaranteeAmount)}</div>
            <div className={styles.secondaryLabel}>Средняя сумма</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>📅</div>
          <div>
            <div className={styles.secondaryValue}>{data.expiringGuarantees.length}</div>
            <div className={styles.secondaryLabel}>Скоро истекают</div>
          </div>
        </div>
      </div>

      {/* Предупреждения об истекающих гарантиях */}
      {data.expiringGuarantees.length > 0 && (
        <div className={styles.alertCard}>
          <h3 className={styles.alertTitle}>⚠️ Гарантии требуют внимания ({data.expiringGuarantees.length})</h3>
          <div className={styles.alertList}>
            {data.expiringGuarantees.slice(0, 5).map(g => (
              <div key={g.id} className={styles.alertItem}>
                <div className={styles.alertItemHeader}>
                  <span className={styles.alertPurchase}>{g.purchaseNumber}</span>
                  <span className={`${styles.alertBadge} ${g.daysLeft <= 7 ? styles.badgeCritical : styles.badgeWarning}`}>
                    {g.daysLeft === 0 ? 'Сегодня!' : g.daysLeft === 1 ? 'Завтра' : `${g.daysLeft} дн`}
                  </span>
                </div>
                <div className={styles.alertItemInfo}>
                  <span>{getTypeLabel(g.type)}</span>
                  <span className={styles.alertAmount}>{formatCurrency(g.amount)}</span>
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
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 Все гарантии
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'expiring' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('expiring')}
        >
          ⏰ Истекающие
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* По типам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 По типам обеспечения</h3>
              {data.byType.length > 0 ? (
                <>
                  <div className={styles.chartWrapperSmall}>
                    <Doughnut
                      data={typeChartData}
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
                  <div className={styles.typeList}>
                    {data.byType.map(type => (
                      <div key={type.type} className={styles.typeItem}>
                        <span className={styles.typeName}>{type.label}</span>
                        <span className={styles.typeCount}>{type.count} шт</span>
                        <span className={styles.typeValue}>{formatCurrency(type.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* По статусам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🔄 По статусам</h3>
              {overview.totalCount > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={statusChartData}
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
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* По месяцам */}
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📈 Динамика по месяцам</h3>
              {data.monthly.length > 0 ? (
                <div className={styles.chartWrapperLarge}>
                  <Bar
                    data={monthlyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.raw as number;
                              return ` ${formatCurrency(value)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: { beginAtZero: true },
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

        {activeTab === 'all' && (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Все гарантии ({filteredGuarantees.length})</h3>
              <div className={styles.filterButtons}>
                {(['all', 'active', 'expiring', 'expired'] as Filter[]).map(f => (
                  <button
                    key={f}
                    className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : f === 'expiring' ? 'Истекают' : 'Истекшие'}
                  </button>
                ))}
              </div>
            </div>

            {filteredGuarantees.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Номер закупки</th>
                    <th>Заказчик</th>
                    <th style={{ textAlign: 'center' }}>Тип</th>
                    <th style={{ textAlign: 'right' }}>Сумма</th>
                    <th style={{ textAlign: 'center' }}>Срок действия</th>
                    <th style={{ textAlign: 'center' }}>Осталось</th>
                    <th style={{ textAlign: 'center' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuarantees.map(g => (
                    <tr 
                      key={g.id}
                      className={
                        g.status === 'expired' ? styles.rowExpired :
                        g.status === 'expiring' || g.daysLeft <= 14 ? styles.rowExpiring : ''
                      }
                    >
                      <td>
                        <span className={styles.purchaseNumber}>{g.purchaseNumber}</span>
                      </td>
                      <td>
                        <span className={styles.customerName}>{g.customer.substring(0, 40)}...</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.typeBadge} ${g.type === 'application' ? styles.typeApplication : styles.typeContract}`}>
                          {g.type === 'application' ? 'Заявка' : 'Контракт'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(g.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {formatDate(g.startDate)} — {formatDate(g.endDate)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {g.status === 'returned' ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : g.daysLeft > 0 ? (
                          <span className={g.daysLeft <= 14 ? styles.daysLeftWarning : styles.daysLeftNormal}>
                            {g.daysLeft} дн
                          </span>
                        ) : (
                          <span className={styles.daysLeftExpired}>Истекла</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.statusBadge} ${getStatusClass(g.status)}`}>
                          {getStatusLabel(g.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <p>Нет гарантий по выбранному фильтру</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expiring' && (
          <div className={styles.tableSection}>
            <h3 className={styles.tableTitle}>⏰ Истекающие гарантии</h3>
            {data.expiringGuarantees.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Номер закупки</th>
                    <th>Заказчик</th>
                    <th style={{ textAlign: 'center' }}>Тип</th>
                    <th style={{ textAlign: 'right' }}>Сумма</th>
                    <th style={{ textAlign: 'center' }}>Истекает</th>
                    <th style={{ textAlign: 'center' }}>Осталось</th>
                    <th>Исполнитель</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expiringGuarantees.map(g => (
                    <tr 
                      key={g.id}
                      className={g.daysLeft <= 7 ? styles.rowCritical : styles.rowExpiring}
                    >
                      <td>
                        <span className={styles.purchaseNumber}>{g.purchaseNumber}</span>
                      </td>
                      <td>
                        <span className={styles.customerName}>{g.customer.substring(0, 40)}...</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.typeBadge} ${g.type === 'application' ? styles.typeApplication : styles.typeContract}`}>
                          {g.type === 'application' ? 'Заявка' : 'Контракт'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(g.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {formatDate(g.endDate)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={g.daysLeft <= 7 ? styles.daysLeftCritical : styles.daysLeftWarning}>
                          {g.daysLeft === 0 ? 'Сегодня!' : `${g.daysLeft} дн`}
                        </span>
                      </td>
                      <td>
                        {g.executor || <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <p>Нет истекающих гарантий — всё под контролем!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Рекомендации */}
      <div className={styles.insightsCard}>
        <h3 className={styles.insightsTitle}>💡 Рекомендации</h3>
        <div className={styles.insightsList}>
          {overview.totalCount > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📊</span>
                <span>
                  Всего обеспечения: <strong>{formatCurrency(overview.totalAmount)}</strong> ({overview.totalCount} гарантий)
                </span>
              </div>
              {overview.expiringCount > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⚠️</span>
                  <span style={{ color: '#d97706' }}>
                    <strong>{overview.expiringCount} гарантий</strong> истекают в ближайшее время — проверьте сроки!
                  </span>
                </div>
              )}
              {overview.expiredCount > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{overview.expiredCount} гарантий</strong> истекли — требуется возврат или продление
                  </span>
                </div>
              )}
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>💰</span>
                <span>
                  Активное обеспечение: <strong>{formatCurrency(overview.activeAmount)}</strong>
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📝</span>
                <span>
                  Своевременно возвращайте гарантии после завершения контрактов
                </span>
              </div>
            </>
          )}
          {overview.totalCount === 0 && (
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>📭</span>
              <span>Нет данных по банковским гарантиям за выбранный период</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
