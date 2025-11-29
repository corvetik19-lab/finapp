'use client';

import { useState } from 'react';
import type { DebtsReportData } from '@/lib/tenders/debts-report-service';
import styles from './DebtsReport.module.css';

interface Props {
  initialData: DebtsReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'all' | 'critical' | 'customers';
type SortBy = 'debt' | 'overdue' | 'customer';

export default function DebtsReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DebtsReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('debt');

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

      const response = await fetch(`/api/tenders/debts-report?${params}`);
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
      ['Отчёт по дебиторской задолженности'],
      [],
      ['Показатель', 'Значение'],
      ['Общая задолженность', data.overview.totalDebt.toString()],
      ['Текущая', data.overview.currentDebt.toString()],
      ['Требует внимания', data.overview.warningDebt.toString()],
      ['Просрочено', data.overview.overdueDebt.toString()],
      ['Критично', data.overview.criticalDebt.toString()],
      ['Должников', data.overview.debtorsCount.toString()],
      ['Контрактов', data.overview.contractsCount.toString()],
      [],
      ['Должники'],
      ['Заказчик', 'Номер закупки', 'Сумма контракта', 'Оплачено', 'Долг', 'Срок оплаты', 'Просрочка (дн)', 'Статус'],
      ...data.debtors.map(d => [d.customer, d.purchaseNumber, d.contractPrice.toString(), d.paidAmount.toString(), d.debtAmount.toString(), d.dueDate || '', d.daysOverdue.toString(), d.status]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debts-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      current: 'В срок',
      warning: 'Внимание',
      overdue: 'Просрочено',
      critical: 'Критично',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      current: styles.statusCurrent,
      warning: styles.statusWarning,
      overdue: styles.statusOverdue,
      critical: styles.statusCritical,
    };
    return classes[status] || '';
  };

  // Сортировка должников
  const sortedDebtors = [...data.debtors].sort((a, b) => {
    if (sortBy === 'debt') return b.debtAmount - a.debtAmount;
    if (sortBy === 'overdue') return b.daysOverdue - a.daysOverdue;
    return a.customer.localeCompare(b.customer);
  });

  const { overview } = data;

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📋</span>
            Дебиторская задолженность
          </h1>
          <p className={styles.subtitle}>Контроль долгов заказчиков</p>
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
        <div className={`${styles.metricCard} ${styles.metricDanger}`}>
          <div className={styles.metricIcon}>💰</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalDebt)}</div>
            <div className={styles.metricLabel}>Общая задолженность</div>
            <div className={styles.metricSub}>{overview.contractsCount} контрактов</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>✅</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.currentDebt)}</div>
            <div className={styles.metricLabel}>В срок</div>
            <div className={styles.metricSub}>Без просрочки</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricWarning}`}>
          <div className={styles.metricIcon}>⚠️</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.warningDebt + overview.overdueDebt)}</div>
            <div className={styles.metricLabel}>Просрочено</div>
            <div className={styles.metricSub}>Требует внимания</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${overview.criticalDebt > 0 ? styles.metricCritical : styles.metricSuccess}`}>
          <div className={styles.metricIcon}>{overview.criticalDebt > 0 ? '🚨' : '👍'}</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.criticalDebt)}</div>
            <div className={styles.metricLabel}>Критично</div>
            <div className={styles.metricSub}>{overview.criticalDebt > 0 ? 'Срочно взыскать!' : 'Нет критичных'}</div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>🏢</div>
          <div>
            <div className={styles.secondaryValue}>{overview.debtorsCount}</div>
            <div className={styles.secondaryLabel}>Должников</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>⏱️</div>
          <div>
            <div className={styles.secondaryValue}>{overview.avgDaysOverdue} дн</div>
            <div className={styles.secondaryLabel}>Ср. просрочка</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>📊</div>
          <div>
            <div className={styles.secondaryValue}>{overview.collectionRate.toFixed(1)}%</div>
            <div className={styles.secondaryLabel}>Собираемость</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>📅</div>
          <div>
            <div className={styles.secondaryValue}>{data.upcomingPayments.length}</div>
            <div className={styles.secondaryLabel}>Ожидаемых платежей</div>
          </div>
        </div>
      </div>

      {/* Предупреждения о критических должниках */}
      {data.criticalDebtors.length > 0 && (
        <div className={styles.alertCard}>
          <h3 className={styles.alertTitle}>🚨 Критические должники — требуют немедленных действий!</h3>
          <div className={styles.alertList}>
            {data.criticalDebtors.slice(0, 5).map(debtor => (
              <div key={debtor.id} className={styles.alertItem}>
                <div className={styles.alertItemHeader}>
                  <span className={styles.alertPurchase}>{debtor.purchaseNumber}</span>
                  <span className={`${styles.alertBadge} ${styles.badgeCritical}`}>
                    +{debtor.daysOverdue} дн
                  </span>
                </div>
                <div className={styles.alertItemInfo}>
                  <span>{debtor.customer.substring(0, 50)}...</span>
                  <span className={styles.alertAmount}>{formatCurrency(debtor.debtAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 Все должники
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'critical' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('critical')}
        >
          🚨 Просроченные
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'customers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          🏢 По заказчикам
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'all' && (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Все должники ({data.debtors.length})</h3>
              <div className={styles.sortButtons}>
                <span className={styles.sortLabel}>Сортировка:</span>
                <button
                  className={`${styles.sortBtn} ${sortBy === 'debt' ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortBy('debt')}
                >
                  По сумме
                </button>
                <button
                  className={`${styles.sortBtn} ${sortBy === 'overdue' ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortBy('overdue')}
                >
                  По просрочке
                </button>
                <button
                  className={`${styles.sortBtn} ${sortBy === 'customer' ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortBy('customer')}
                >
                  По заказчику
                </button>
              </div>
            </div>

            {sortedDebtors.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Заказчик</th>
                    <th>Номер закупки</th>
                    <th style={{ textAlign: 'right' }}>Контракт</th>
                    <th style={{ textAlign: 'right' }}>Оплачено</th>
                    <th style={{ textAlign: 'right' }}>Долг</th>
                    <th style={{ textAlign: 'center' }}>Срок</th>
                    <th style={{ textAlign: 'center' }}>Просрочка</th>
                    <th style={{ textAlign: 'center' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDebtors.map(debtor => (
                    <tr 
                      key={debtor.id}
                      className={
                        debtor.status === 'critical' ? styles.rowCritical :
                        debtor.status === 'overdue' ? styles.rowOverdue :
                        debtor.status === 'warning' ? styles.rowWarning : ''
                      }
                    >
                      <td>
                        <span className={styles.customerName}>{debtor.customer.substring(0, 40)}...</span>
                      </td>
                      <td>
                        <span className={styles.purchaseNumber}>{debtor.purchaseNumber}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(debtor.contractPrice)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        {formatCurrency(debtor.paidAmount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.debtBadge}>{formatCurrency(debtor.debtAmount)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {formatDate(debtor.dueDate)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {debtor.daysOverdue > 0 ? (
                          <span className={styles.overdueBadge}>+{debtor.daysOverdue} дн</span>
                        ) : (
                          <span style={{ color: '#10b981' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.statusBadge} ${getStatusClass(debtor.status)}`}>
                          {getStatusLabel(debtor.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎉</span>
                <p>Нет должников — отличная работа!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'critical' && (
          <div className={styles.tableSection}>
            <h3 className={styles.tableTitle}>🚨 Просроченные платежи</h3>
            {data.criticalDebtors.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Заказчик</th>
                    <th>Номер закупки</th>
                    <th style={{ textAlign: 'right' }}>Долг</th>
                    <th style={{ textAlign: 'center' }}>Просрочка</th>
                    <th style={{ textAlign: 'center' }}>Статус</th>
                    <th>Исполнитель</th>
                  </tr>
                </thead>
                <tbody>
                  {data.criticalDebtors.map(debtor => (
                    <tr 
                      key={debtor.id}
                      className={debtor.status === 'critical' ? styles.rowCritical : styles.rowOverdue}
                    >
                      <td>
                        <span className={styles.customerName}>{debtor.customer.substring(0, 40)}...</span>
                      </td>
                      <td>
                        <span className={styles.purchaseNumber}>{debtor.purchaseNumber}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.debtBadge}>{formatCurrency(debtor.debtAmount)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.overdueBadge}>+{debtor.daysOverdue} дн</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.statusBadge} ${getStatusClass(debtor.status)}`}>
                          {getStatusLabel(debtor.status)}
                        </span>
                      </td>
                      <td>
                        {debtor.executor || <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <p>Нет просроченных платежей!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className={styles.tableSection}>
            <h3 className={styles.tableTitle}>🏢 Задолженность по заказчикам</h3>
            {data.byCustomer.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Заказчик</th>
                    <th style={{ textAlign: 'right' }}>Контрактов</th>
                    <th style={{ textAlign: 'right' }}>Общий долг</th>
                    <th style={{ textAlign: 'right' }}>Просрочено</th>
                    <th style={{ textAlign: 'center' }}>Ср. просрочка</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCustomer.map((customer, idx) => (
                    <tr 
                      key={customer.customer}
                      className={customer.overdueDebt > 0 ? styles.rowWarning : ''}
                    >
                      <td>
                        <span className={styles.rankBadge}>{idx + 1}</span>
                      </td>
                      <td>
                        <span className={styles.customerName}>{customer.customer.substring(0, 50)}...</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{customer.contractsCount}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={styles.debtBadge}>{formatCurrency(customer.totalDebt)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {customer.overdueDebt > 0 ? (
                          <span className={styles.overdueBadge}>{formatCurrency(customer.overdueDebt)}</span>
                        ) : (
                          <span style={{ color: '#10b981' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {customer.avgDaysOverdue > 0 ? (
                          <span>{customer.avgDaysOverdue} дн</span>
                        ) : (
                          <span style={{ color: '#10b981' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <p>Нет данных по заказчикам</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Рекомендации */}
      <div className={styles.insightsCard}>
        <h3 className={styles.insightsTitle}>💡 Рекомендации по взысканию</h3>
        <div className={styles.insightsList}>
          {overview.totalDebt > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📊</span>
                <span>
                  Общая дебиторская задолженность: <strong>{formatCurrency(overview.totalDebt)}</strong>
                </span>
              </div>
              {overview.criticalDebt > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{formatCurrency(overview.criticalDebt)}</strong> критической задолженности — немедленно направить претензии!
                  </span>
                </div>
              )}
              {overview.overdueDebt > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⚠️</span>
                  <span style={{ color: '#d97706' }}>
                    <strong>{formatCurrency(overview.overdueDebt)}</strong> просроченной задолженности — позвонить должникам
                  </span>
                </div>
              )}
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📈</span>
                <span>
                  Собираемость платежей: <strong>{overview.collectionRate.toFixed(1)}%</strong>
                </span>
              </div>
              {overview.avgDaysOverdue > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>⏱️</span>
                  <span>
                    Средняя просрочка: <strong>{overview.avgDaysOverdue} дней</strong>
                  </span>
                </div>
              )}
            </>
          )}
          {overview.totalDebt === 0 && (
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>🎉</span>
              <span>Нет дебиторской задолженности — отличная работа!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
