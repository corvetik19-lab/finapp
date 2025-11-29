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
import type { CustomerPaymentsReportData } from '@/lib/tenders/customer-payments-report-service';
import styles from './CustomerPaymentsReport.module.css';

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
  initialData: CustomerPaymentsReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'customers' | 'contracts' | 'dynamics';
type SortBy = 'amount' | 'overdue' | 'rate';

export default function CustomerPaymentsReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<CustomerPaymentsReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('amount');

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

  const formatDate = (dateStr: string) => {
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

      const response = await fetch(`/api/tenders/customer-payments-report?${params}`);
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
      ['Отчёт по оплатам от заказчиков'],
      [],
      ['Показатель', 'Значение'],
      ['Всего контрактов', data.overview.contractsCount.toString()],
      ['Заказчиков', data.overview.customersCount.toString()],
      ['Общая сумма', data.overview.totalContractValue.toString()],
      ['Получено', data.overview.receivedPayments.toString()],
      ['Ожидается', data.overview.pendingPayments.toString()],
      ['Просрочено', data.overview.overduePayments.toString()],
      ['% оплаты', `${data.overview.paymentRate.toFixed(1)}%`],
      [],
      ['Заказчики'],
      ['Заказчик', 'Контрактов', 'Сумма', 'Оплачено', 'Долг', '% оплаты', 'Просрочено'],
      ...data.customers.map(c => [c.customer, c.contractsCount.toString(), c.totalValue.toString(), c.paidValue.toString(), c.debtValue.toString(), `${c.paymentRate.toFixed(1)}%`, c.overdueCount.toString()]),
      [],
      ['Контракты'],
      ['Номер', 'Заказчик', 'Сумма', 'Оплачено', 'К оплате', 'Статус'],
      ...data.contracts.map(c => [c.purchaseNumber, c.customer, c.contractValue.toString(), c.paidAmount.toString(), c.pendingAmount.toString(), c.status]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-payments-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Данные для графика статусов
  const statusChartData = useMemo(() => ({
    labels: ['Оплачено', 'Ожидается', 'Просрочено', 'Критично'],
    datasets: [
      {
        data: [
          data.paymentStatus.paid.count,
          data.paymentStatus.pending.count,
          data.paymentStatus.overdue.count,
          data.paymentStatus.critical.count,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [data.paymentStatus]);

  // Данные для графика сумм по статусам
  const amountChartData = useMemo(() => ({
    labels: ['Оплачено', 'Ожидается', 'Просрочено', 'Критично'],
    datasets: [
      {
        data: [
          data.paymentStatus.paid.amount,
          data.paymentStatus.pending.amount,
          data.paymentStatus.overdue.amount,
          data.paymentStatus.critical.amount,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }), [data.paymentStatus]);

  // Данные для графика динамики
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Ожидается',
        data: data.monthly.map(m => m.expectedAmount),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Получено',
        data: data.monthly.map(m => m.receivedAmount),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [data.monthly]);

  // Сортировка контрактов
  const sortedContracts = useMemo(() => {
    return [...data.contracts].sort((a, b) => {
      if (sortBy === 'amount') return b.pendingAmount - a.pendingAmount;
      if (sortBy === 'overdue') return a.daysToPayment - b.daysToPayment;
      return b.paymentRate - a.paymentRate;
    });
  }, [data.contracts, sortBy]);

  const { overview, paymentStatus } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>💰</span>
            Оплаты от заказчиков
          </h1>
          <p className={styles.subtitle}>Дебиторская задолженность и контроль платежей</p>
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
            <div className={styles.metricValue}>{formatCurrency(overview.totalContractValue)}</div>
            <div className={styles.metricLabel}>Общая сумма</div>
            <div className={styles.metricSub}>{overview.contractsCount} контрактов</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>✅</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.receivedPayments)}</div>
            <div className={styles.metricLabel}>Получено</div>
            <div className={styles.metricSub}>
              <strong>{overview.paymentRate.toFixed(1)}%</strong> от общей суммы
            </div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricWarning}`}>
          <div className={styles.metricIcon}>⏳</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.pendingPayments)}</div>
            <div className={styles.metricLabel}>Ожидается</div>
            <div className={styles.metricSub}>{paymentStatus.pending.count} контрактов</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.overduePayments > 0 ? styles.metricDanger : styles.metricSuccess}`}>
          <div className={styles.metricIcon}>{overview.overduePayments > 0 ? '⚠️' : '👍'}</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.overduePayments)}</div>
            <div className={styles.metricLabel}>Просрочено</div>
            <div className={styles.metricSub}>
              {overview.overduePayments > 0 ? `${paymentStatus.overdue.count + paymentStatus.critical.count} контрактов` : 'Нет просрочек'}
            </div>
          </div>
        </div>
      </div>

      {/* Прогресс оплаты */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <h3 className={styles.progressTitle}>📊 Прогресс оплаты</h3>
          <span className={styles.progressPercent}>{overview.paymentRate.toFixed(1)}%</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFillSuccess}
              style={{ width: `${overview.paymentRate}%` }}
            />
            <div
              className={styles.progressFillWarning}
              style={{ 
                width: overview.totalContractValue > 0 ? `${(overview.pendingPayments / overview.totalContractValue) * 100}%` : '0%',
                left: `${overview.paymentRate}%`
              }}
            />
            <div
              className={styles.progressFillDanger}
              style={{ 
                width: overview.totalContractValue > 0 ? `${(overview.overduePayments / overview.totalContractValue) * 100}%` : '0%',
                left: `${overview.paymentRate + (overview.pendingPayments / overview.totalContractValue) * 100}%`
              }}
            />
          </div>
        </div>
        <div className={styles.progressStats}>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#10b981' }}></span>
            <span>Получено: {formatCurrency(overview.receivedPayments)}</span>
          </div>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#3b82f6' }}></span>
            <span>Ожидается: {formatCurrency(overview.pendingPayments)}</span>
          </div>
          <div className={styles.progressStat}>
            <span className={styles.progressDot} style={{ background: '#ef4444' }}></span>
            <span>Просрочено: {formatCurrency(overview.overduePayments)}</span>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>🏢</div>
          <div>
            <div className={styles.secondaryValue}>{overview.customersCount}</div>
            <div className={styles.secondaryLabel}>Заказчиков</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>⏱️</div>
          <div>
            <div className={styles.secondaryValue}>{overview.avgPaymentDays} дн</div>
            <div className={styles.secondaryLabel}>Ср. срок оплаты</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>📅</div>
          <div>
            <div className={styles.secondaryValue}>{data.upcomingPayments.length}</div>
            <div className={styles.secondaryLabel}>Ожидаемых платежей</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: overview.overduePayments > 0 ? '#fee2e2' : '#d1fae5', color: overview.overduePayments > 0 ? '#dc2626' : '#059669' }}>
            {overview.overduePayments > 0 ? '🚨' : '✅'}
          </div>
          <div>
            <div className={styles.secondaryValue}>{data.overdueContracts.length}</div>
            <div className={styles.secondaryLabel}>Просроченных</div>
          </div>
        </div>
      </div>

      {/* Предупреждения */}
      {(data.upcomingPayments.length > 0 || data.overdueContracts.length > 0) && (
        <div className={styles.alertsGrid}>
          {data.upcomingPayments.length > 0 && (
            <div className={styles.alertCard}>
              <h3 className={styles.alertTitle}>⏰ Ожидаемые платежи ({data.upcomingPayments.length})</h3>
              <div className={styles.alertList}>
                {data.upcomingPayments.slice(0, 5).map(item => (
                  <div key={item.id} className={`${styles.alertItem} ${styles[`alert${item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}`]}`}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={`${styles.alertBadge} ${styles[`badge${item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}`]}`}>
                        {item.daysLeft === 0 ? 'Сегодня' : item.daysLeft === 1 ? 'Завтра' : `${item.daysLeft} дн`}
                      </span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer}</span>
                      <span className={styles.alertAmount}>{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.overdueContracts.length > 0 && (
            <div className={`${styles.alertCard} ${styles.alertDanger}`}>
              <h3 className={styles.alertTitle}>🚨 Просроченные платежи ({data.overdueContracts.length})</h3>
              <div className={styles.alertList}>
                {data.overdueContracts.slice(0, 5).map(item => (
                  <div key={item.id} className={styles.alertItem}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={`${styles.alertBadge} ${styles.badgeCritical}`}>
                        +{item.daysOverdue} дн
                      </span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer}</span>
                      <span className={styles.alertAmount}>{formatCurrency(item.amount)}</span>
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
          className={`${styles.tab} ${activeTab === 'customers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          🏢 Заказчики
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'contracts' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          📋 Контракты
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
            {/* По статусам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 Распределение по статусам</h3>
              {overview.contractsCount > 0 ? (
                <>
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
                  <div className={styles.statusList}>
                    <div className={styles.statusItem}>
                      <span className={styles.statusIndicator} style={{ background: '#10b981' }} />
                      <span className={styles.statusName}>Оплачено</span>
                      <span className={styles.statusCount}>{paymentStatus.paid.count}</span>
                      <span className={styles.statusValue}>{formatCurrency(paymentStatus.paid.amount)}</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusIndicator} style={{ background: '#3b82f6' }} />
                      <span className={styles.statusName}>Ожидается</span>
                      <span className={styles.statusCount}>{paymentStatus.pending.count}</span>
                      <span className={styles.statusValue}>{formatCurrency(paymentStatus.pending.amount)}</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusIndicator} style={{ background: '#f59e0b' }} />
                      <span className={styles.statusName}>Просрочено</span>
                      <span className={styles.statusCount}>{paymentStatus.overdue.count}</span>
                      <span className={styles.statusValue}>{formatCurrency(paymentStatus.overdue.amount)}</span>
                    </div>
                    <div className={styles.statusItem}>
                      <span className={styles.statusIndicator} style={{ background: '#ef4444' }} />
                      <span className={styles.statusName}>Критично</span>
                      <span className={styles.statusCount}>{paymentStatus.critical.count}</span>
                      <span className={styles.statusValue}>{formatCurrency(paymentStatus.critical.amount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* Суммы по статусам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💰 Суммы по статусам</h3>
              {overview.contractsCount > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={amountChartData}
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

            {/* Финансовый обзор */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💵 Финансовый обзор</h3>
              <div className={styles.financeStats}>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Общая сумма контрактов</div>
                  <div className={styles.financeValue}>{formatCurrency(overview.totalContractValue)}</div>
                  <div className={styles.financeBar}>
                    <div className={styles.financeBarFill} style={{ width: '100%', background: '#94a3b8' }} />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Получено платежей</div>
                  <div className={styles.financeValue} style={{ color: '#10b981' }}>{formatCurrency(overview.receivedPayments)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: overview.totalContractValue > 0 ? `${(overview.receivedPayments / overview.totalContractValue) * 100}%` : '0%', 
                        background: '#10b981' 
                      }} 
                    />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Дебиторская задолженность</div>
                  <div className={styles.financeValue} style={{ color: '#ef4444' }}>{formatCurrency(overview.pendingPayments + overview.overduePayments)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: overview.totalContractValue > 0 ? `${((overview.pendingPayments + overview.overduePayments) / overview.totalContractValue) * 100}%` : '0%', 
                        background: '#ef4444' 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📈 Ключевые показатели</h3>
              <div className={styles.kpiStats}>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{overview.paymentRate.toFixed(1)}%</div>
                  <div className={styles.kpiLabel}>% оплаты</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{overview.avgPaymentDays}</div>
                  <div className={styles.kpiLabel}>Ср. дней оплаты</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{overview.customersCount}</div>
                  <div className={styles.kpiLabel}>Заказчиков</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue} style={{ color: overview.overduePayments > 0 ? '#ef4444' : '#10b981' }}>
                    {data.overdueContracts.length}
                  </div>
                  <div className={styles.kpiLabel}>Просрочено</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className={styles.customersSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>🏢 Дебиторская задолженность по заказчикам</h3>
              {data.customers.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Заказчик</th>
                      <th style={{ textAlign: 'right' }}>Контрактов</th>
                      <th style={{ textAlign: 'right' }}>Сумма</th>
                      <th style={{ textAlign: 'right' }}>Оплачено</th>
                      <th style={{ textAlign: 'right' }}>Долг</th>
                      <th style={{ textAlign: 'right' }}>% оплаты</th>
                      <th style={{ textAlign: 'right' }}>Просрочено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((customer, idx) => (
                      <tr key={customer.customer} className={customer.overdueCount > 0 ? styles.rowWarning : ''}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.customerName}>{customer.customer}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{customer.contractsCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(customer.totalValue)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                          {formatCurrency(customer.paidValue)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {customer.debtValue > 0 ? (
                            <span className={styles.debtBadge}>{formatCurrency(customer.debtValue)}</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.rateBadge}
                            style={{
                              background: customer.paymentRate >= 100 ? '#dcfce7' : customer.paymentRate >= 50 ? '#fef3c7' : '#fee2e2',
                              color: customer.paymentRate >= 100 ? '#166534' : customer.paymentRate >= 50 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {customer.paymentRate.toFixed(0)}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {customer.overdueCount > 0 ? (
                            <span className={styles.overdueBadge}>{customer.overdueCount}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
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

        {activeTab === 'contracts' && (
          <div className={styles.contractsSection}>
            <div className={styles.sortButtons}>
              <span className={styles.sortLabel}>Сортировка:</span>
              <button
                className={`${styles.sortBtn} ${sortBy === 'amount' ? styles.sortBtnActive : ''}`}
                onClick={() => setSortBy('amount')}
              >
                По сумме
              </button>
              <button
                className={`${styles.sortBtn} ${sortBy === 'overdue' ? styles.sortBtnActive : ''}`}
                onClick={() => setSortBy('overdue')}
              >
                По сроку
              </button>
              <button
                className={`${styles.sortBtn} ${sortBy === 'rate' ? styles.sortBtnActive : ''}`}
                onClick={() => setSortBy('rate')}
              >
                По % оплаты
              </button>
            </div>

            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📋 Контракты и платежи</h3>
              {sortedContracts.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Номер закупки</th>
                      <th>Заказчик</th>
                      <th style={{ textAlign: 'right' }}>Сумма</th>
                      <th style={{ textAlign: 'right' }}>Оплачено</th>
                      <th style={{ textAlign: 'right' }}>К оплате</th>
                      <th style={{ textAlign: 'center' }}>Срок</th>
                      <th style={{ textAlign: 'center' }}>Статус</th>
                      <th>Исполнитель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContracts.map((contract) => (
                      <tr 
                        key={contract.id} 
                        className={
                          contract.status === 'critical' ? styles.rowCritical : 
                          contract.status === 'overdue' ? styles.rowWarning : ''
                        }
                      >
                        <td>
                          <span className={styles.purchaseNumber}>{contract.purchaseNumber}</span>
                        </td>
                        <td>
                          <span className={styles.customerName}>{contract.customer}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(contract.contractValue)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                          {formatCurrency(contract.paidAmount)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {contract.pendingAmount > 0 ? (
                            <span className={styles.debtBadge}>{formatCurrency(contract.pendingAmount)}</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {contract.dueDate ? (
                            <>
                              <div>{formatDate(contract.dueDate)}</div>
                              {contract.daysToPayment !== 0 && (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: contract.daysToPayment < 0 ? '#ef4444' : contract.daysToPayment <= 7 ? '#f59e0b' : '#64748b',
                                  fontWeight: 600
                                }}>
                                  {contract.daysToPayment < 0 ? `+${Math.abs(contract.daysToPayment)} дн` : `${contract.daysToPayment} дн`}
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.statusBadge} ${styles[`status${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}`]}`}>
                            {contract.status === 'paid' ? 'Оплачено' : 
                             contract.status === 'pending' ? 'Ожидается' : 
                             contract.status === 'overdue' ? 'Просрочено' : 'Критично'}
                          </span>
                        </td>
                        <td>
                          {contract.executor || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет контрактов</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dynamics' && (
          <div className={styles.dynamicsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📈 Динамика платежей по месяцам</h3>
              <div className={styles.chartWrapperLarge}>
                <Line
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
                            return ` ${context.dataset.label}: ${formatCurrency(value)}`;
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
            </div>

            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📅 Детализация по месяцам</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Месяц</th>
                    <th style={{ textAlign: 'right' }}>Контрактов</th>
                    <th style={{ textAlign: 'right' }}>Ожидается</th>
                    <th style={{ textAlign: 'right' }}>Получено</th>
                    <th style={{ textAlign: 'right' }}>% оплаты</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map(month => (
                    <tr key={month.month}>
                      <td><strong>{month.monthLabel}</strong></td>
                      <td style={{ textAlign: 'right' }}>{month.contractsCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(month.expectedAmount)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                        {formatCurrency(month.receivedAmount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={styles.rateBadge}
                          style={{
                            background: month.paymentRate >= 100 ? '#dcfce7' : month.paymentRate >= 50 ? '#fef3c7' : '#fee2e2',
                            color: month.paymentRate >= 100 ? '#166534' : month.paymentRate >= 50 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {month.paymentRate.toFixed(0)}%
                        </span>
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
        <h3 className={styles.insightsTitle}>💡 Рекомендации</h3>
        <div className={styles.insightsList}>
          {overview.contractsCount > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>
                  {overview.paymentRate >= 80 ? '🏆' : overview.paymentRate >= 50 ? '📈' : '⚠️'}
                </span>
                <span>
                  Процент оплаты <strong>{overview.paymentRate.toFixed(1)}%</strong> —{' '}
                  {overview.paymentRate >= 80 ? 'отличная платёжная дисциплина!' : overview.paymentRate >= 50 ? 'хороший результат' : 'требуется усилить работу с дебиторкой'}
                </span>
              </div>
              {overview.overduePayments > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{formatCurrency(overview.overduePayments)}</strong> просрочено — отправьте претензии заказчикам!
                  </span>
                </div>
              )}
              {data.upcomingPayments.length > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏰</span>
                  <span style={{ color: '#d97706' }}>
                    <strong>{data.upcomingPayments.length} платежей</strong> ожидается в ближайший месяц — контролируйте сроки
                  </span>
                </div>
              )}
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>💰</span>
                <span>
                  Дебиторская задолженность: <strong>{formatCurrency(overview.pendingPayments + overview.overduePayments)}</strong>
                </span>
              </div>
              {overview.avgPaymentDays > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏱️</span>
                  <span>
                    Средний срок оплаты: <strong>{overview.avgPaymentDays} дней</strong>
                  </span>
                </div>
              )}
            </>
          )}
          {overview.contractsCount === 0 && (
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
