'use client';

import { useState, useMemo } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
import type { ExpensesReportData } from '@/lib/tenders/expenses-report-service';
import styles from './ExpensesReport.module.css';

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
  initialData: ExpensesReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'tenders' | 'executors' | 'dynamics';

export default function ExpensesReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<ExpensesReportData>(initialData);
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

      const response = await fetch(`/api/tenders/expenses-report?${params}`);
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
      ['Отчёт по расходам'],
      [],
      ['Показатель', 'Значение'],
      ['Всего расходов', data.overview.totalCosts.toString()],
      ['Закупка', data.overview.purchaseCosts.toString()],
      ['Логистика', data.overview.logisticsCosts.toString()],
      ['Прочие', data.overview.otherCosts.toString()],
      ['Обеспечение', data.overview.securityCosts.toString()],
      ['Сумма контрактов', data.overview.totalContractValue.toString()],
      ['Прибыль', data.overview.totalProfit.toString()],
      ['Маржа %', `${data.overview.profitMargin.toFixed(1)}%`],
      [],
      ['Тендеры'],
      ['Номер', 'Заказчик', 'Сумма контракта', 'Закупка', 'Логистика', 'Прочие', 'Всего расходов', 'Маржа %'],
      ...data.tenders.map(t => [t.purchaseNumber, t.customer, t.contractPrice.toString(), t.purchaseCost.toString(), t.logisticsCost.toString(), t.otherCosts.toString(), t.totalCosts.toString(), `${t.profitMargin.toFixed(1)}%`]),
    ];

    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Данные для графика категорий расходов
  const categoriesChartData = useMemo(() => ({
    labels: data.categories.map(c => c.name),
    datasets: [
      {
        data: data.categories.map(c => c.amount),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        borderWidth: 0,
      },
    ],
  }), [data.categories]);

  // Данные для графика динамики расходов
  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Закупка',
        data: data.monthly.map(m => m.purchaseCosts),
        backgroundColor: '#3b82f6',
        stack: 'costs',
      },
      {
        label: 'Логистика',
        data: data.monthly.map(m => m.logisticsCosts),
        backgroundColor: '#10b981',
        stack: 'costs',
      },
      {
        label: 'Прочие',
        data: data.monthly.map(m => m.otherCosts),
        backgroundColor: '#f59e0b',
        stack: 'costs',
      },
    ],
  }), [data.monthly]);

  // Данные для графика маржинальности
  const marginChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      {
        label: 'Маржинальность %',
        data: data.monthly.map(m => m.profitMargin),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
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
            <span className={styles.titleIcon}>💸</span>
            Расходы по тендерам
          </h1>
          <p className={styles.subtitle}>Анализ затрат и маржинальности</p>
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
            <div className={styles.metricValue}>{formatCurrency(overview.totalCosts)}</div>
            <div className={styles.metricLabel}>Всего расходов</div>
            <div className={styles.metricSub}>{overview.tendersCount} тендеров</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricPrimary}`}>
          <div className={styles.metricIcon}>📋</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalContractValue)}</div>
            <div className={styles.metricLabel}>Сумма контрактов</div>
            <div className={styles.metricSub}>Выручка</div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
          <div className={styles.metricIcon}>📈</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.totalProfit)}</div>
            <div className={styles.metricLabel}>Прибыль</div>
            <div className={styles.metricSub}>
              <strong>{overview.profitMargin.toFixed(1)}%</strong> маржа
            </div>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricWarning}`}>
          <div className={styles.metricIcon}>📊</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{formatCurrency(overview.avgCostPerTender)}</div>
            <div className={styles.metricLabel}>Ср. расход</div>
            <div className={styles.metricSub}>на 1 тендер</div>
          </div>
        </div>
      </div>

      {/* Структура расходов */}
      <div className={styles.structureCard}>
        <h3 className={styles.structureTitle}>📊 Структура расходов</h3>
        <div className={styles.structureGrid}>
          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#3b82f6' }}></span>
              <span className={styles.structureName}>Закупка</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.purchaseCosts)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalCosts > 0 ? `${(overview.purchaseCosts / overview.totalCosts) * 100}%` : '0%',
                  background: '#3b82f6'
                }} 
              />
            </div>
            <div className={styles.structurePercent}>
              {overview.totalCosts > 0 ? ((overview.purchaseCosts / overview.totalCosts) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#10b981' }}></span>
              <span className={styles.structureName}>Логистика</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.logisticsCosts)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalCosts > 0 ? `${(overview.logisticsCosts / overview.totalCosts) * 100}%` : '0%',
                  background: '#10b981'
                }} 
              />
            </div>
            <div className={styles.structurePercent}>
              {overview.totalCosts > 0 ? ((overview.logisticsCosts / overview.totalCosts) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#f59e0b' }}></span>
              <span className={styles.structureName}>Прочие</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.otherCosts)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalCosts > 0 ? `${(overview.otherCosts / overview.totalCosts) * 100}%` : '0%',
                  background: '#f59e0b'
                }} 
              />
            </div>
            <div className={styles.structurePercent}>
              {overview.totalCosts > 0 ? ((overview.otherCosts / overview.totalCosts) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className={styles.structureItem}>
            <div className={styles.structureHeader}>
              <span className={styles.structureDot} style={{ background: '#8b5cf6' }}></span>
              <span className={styles.structureName}>Обеспечение</span>
            </div>
            <div className={styles.structureValue}>{formatCurrency(overview.securityCosts)}</div>
            <div className={styles.structureBar}>
              <div 
                className={styles.structureBarFill} 
                style={{ 
                  width: overview.totalCosts > 0 ? `${(overview.securityCosts / overview.totalCosts) * 100}%` : '0%',
                  background: '#8b5cf6'
                }} 
              />
            </div>
            <div className={styles.structurePercent}>
              {overview.totalCosts > 0 ? ((overview.securityCosts / overview.totalCosts) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className={styles.secondaryMetrics}>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>📦</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.purchaseCosts)}</div>
            <div className={styles.secondaryLabel}>Закупка товаров</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#d1fae5', color: '#059669' }}>🚚</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.logisticsCosts)}</div>
            <div className={styles.secondaryLabel}>Логистика</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>🔧</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.otherCosts)}</div>
            <div className={styles.secondaryLabel}>Прочие расходы</div>
          </div>
        </div>
        <div className={styles.secondaryCard}>
          <div className={styles.secondaryIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>🔒</div>
          <div>
            <div className={styles.secondaryValue}>{formatCurrency(overview.securityCosts)}</div>
            <div className={styles.secondaryLabel}>Обеспечение</div>
          </div>
        </div>
      </div>

      {/* Предупреждения */}
      {(data.topExpensiveTenders.length > 0 || data.lowMarginTenders.length > 0) && (
        <div className={styles.alertsGrid}>
          {data.topExpensiveTenders.length > 0 && (
            <div className={styles.alertCard}>
              <h3 className={styles.alertTitle}>💰 Топ затратных тендеров</h3>
              <div className={styles.alertList}>
                {data.topExpensiveTenders.map(item => (
                  <div key={item.id} className={styles.alertItem}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={styles.alertBadge}>{formatCurrency(item.totalCosts)}</span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer.substring(0, 40)}...</span>
                      <span className={styles.alertMargin}>Маржа: {item.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.lowMarginTenders.length > 0 && (
            <div className={`${styles.alertCard} ${styles.alertDanger}`}>
              <h3 className={styles.alertTitle}>⚠️ Низкая маржинальность</h3>
              <div className={styles.alertList}>
                {data.lowMarginTenders.map(item => (
                  <div key={item.id} className={styles.alertItem}>
                    <div className={styles.alertItemHeader}>
                      <span className={styles.alertPurchase}>{item.purchaseNumber}</span>
                      <span className={`${styles.alertBadge} ${styles.badgeDanger}`}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div className={styles.alertItemInfo}>
                      <span>{item.customer.substring(0, 40)}...</span>
                      <span className={styles.alertAmount}>{formatCurrency(item.contractPrice)}</span>
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
          className={`${styles.tab} ${activeTab === 'tenders' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tenders')}
        >
          📋 Тендеры
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'executors' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('executors')}
        >
          👤 Исполнители
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
            {/* Структура расходов - круговая диаграмма */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 Структура расходов</h3>
              {data.categories.length > 0 ? (
                <div className={styles.chartWrapperSmall}>
                  <Doughnut
                    data={categoriesChartData}
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

            {/* Финансовые показатели */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>💵 Финансовые показатели</h3>
              <div className={styles.financeStats}>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Выручка (контракты)</div>
                  <div className={styles.financeValue}>{formatCurrency(overview.totalContractValue)}</div>
                  <div className={styles.financeBar}>
                    <div className={styles.financeBarFill} style={{ width: '100%', background: '#94a3b8' }} />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Расходы</div>
                  <div className={styles.financeValue} style={{ color: '#ef4444' }}>{formatCurrency(overview.totalCosts)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: `${overview.costToRevenueRatio}%`, 
                        background: '#ef4444' 
                      }} 
                    />
                  </div>
                </div>
                <div className={styles.financeStat}>
                  <div className={styles.financeLabel}>Прибыль</div>
                  <div className={styles.financeValue} style={{ color: '#10b981' }}>{formatCurrency(overview.totalProfit)}</div>
                  <div className={styles.financeBar}>
                    <div 
                      className={styles.financeBarFill} 
                      style={{ 
                        width: `${overview.profitMargin}%`, 
                        background: '#10b981' 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* По заказчикам */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>🏢 Топ заказчиков по расходам</h3>
              {data.customers.length > 0 ? (
                <div className={styles.customersList}>
                  {data.customers.slice(0, 5).map((customer, idx) => (
                    <div key={customer.customer} className={styles.customerItem}>
                      <span className={styles.customerRank}>{idx + 1}</span>
                      <div className={styles.customerInfo}>
                        <div className={styles.customerName}>{customer.customer.substring(0, 50)}...</div>
                        <div className={styles.customerStats}>
                          {customer.tendersCount} тендеров · Маржа: {customer.profitMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div className={styles.customerValue}>{formatCurrency(customer.totalCosts)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>Нет данных</div>
              )}
            </div>

            {/* KPI */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📈 Ключевые показатели</h3>
              <div className={styles.kpiStats}>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{overview.profitMargin.toFixed(1)}%</div>
                  <div className={styles.kpiLabel}>Маржа</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{overview.costToRevenueRatio.toFixed(1)}%</div>
                  <div className={styles.kpiLabel}>Расходы/Выручка</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{formatCurrency(overview.avgCostPerTender)}</div>
                  <div className={styles.kpiLabel}>Ср. расход</div>
                </div>
                <div className={styles.kpiStat}>
                  <div className={styles.kpiValue}>{formatCurrency(overview.avgProfitPerTender)}</div>
                  <div className={styles.kpiLabel}>Ср. прибыль</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenders' && (
          <div className={styles.tendersSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📋 Расходы по тендерам</h3>
              {data.tenders.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Номер закупки</th>
                      <th>Заказчик</th>
                      <th style={{ textAlign: 'right' }}>Контракт</th>
                      <th style={{ textAlign: 'right' }}>Закупка</th>
                      <th style={{ textAlign: 'right' }}>Логистика</th>
                      <th style={{ textAlign: 'right' }}>Прочие</th>
                      <th style={{ textAlign: 'right' }}>Всего</th>
                      <th style={{ textAlign: 'right' }}>Маржа</th>
                      <th>Исполнитель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenders.map((tender) => (
                      <tr 
                        key={tender.id}
                        className={tender.profitMargin < 10 ? styles.rowDanger : tender.profitMargin < 20 ? styles.rowWarning : ''}
                      >
                        <td>
                          <span className={styles.purchaseNumber}>{tender.purchaseNumber}</span>
                        </td>
                        <td>
                          <span className={styles.customerNameCell}>{tender.customer.substring(0, 40)}...</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(tender.contractPrice)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#3b82f6' }}>
                          {formatCurrency(tender.purchaseCost)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>
                          {formatCurrency(tender.logisticsCost)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#f59e0b' }}>
                          {formatCurrency(tender.otherCosts)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.totalCostBadge}>{formatCurrency(tender.totalCosts)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.marginBadge}
                            style={{
                              background: tender.profitMargin >= 30 ? '#dcfce7' : tender.profitMargin >= 15 ? '#fef3c7' : '#fee2e2',
                              color: tender.profitMargin >= 30 ? '#166534' : tender.profitMargin >= 15 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {tender.profitMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          {tender.executor || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>Нет тендеров с расходами</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'executors' && (
          <div className={styles.executorsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>👤 Расходы по исполнителям</h3>
              {data.executors.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Исполнитель</th>
                      <th style={{ textAlign: 'right' }}>Тендеров</th>
                      <th style={{ textAlign: 'right' }}>Закупка</th>
                      <th style={{ textAlign: 'right' }}>Логистика</th>
                      <th style={{ textAlign: 'right' }}>Прочие</th>
                      <th style={{ textAlign: 'right' }}>Всего</th>
                      <th style={{ textAlign: 'right' }}>Контракты</th>
                      <th style={{ textAlign: 'right' }}>Маржа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.executors.map((exec, idx) => (
                      <tr key={exec.executor}>
                        <td>
                          <span className={styles.rankBadge}>{idx + 1}</span>
                        </td>
                        <td>
                          <span className={styles.executorName}>{exec.executor}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{exec.tendersCount}</td>
                        <td style={{ textAlign: 'right', color: '#3b82f6' }}>
                          {formatCurrency(exec.purchaseCosts)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>
                          {formatCurrency(exec.logisticsCosts)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#f59e0b' }}>
                          {formatCurrency(exec.otherCosts)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(exec.totalCosts)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {formatCurrency(exec.totalContractValue)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={styles.marginBadge}
                            style={{
                              background: exec.profitMargin >= 30 ? '#dcfce7' : exec.profitMargin >= 15 ? '#fef3c7' : '#fee2e2',
                              color: exec.profitMargin >= 30 ? '#166534' : exec.profitMargin >= 15 ? '#92400e' : '#991b1b',
                            }}
                          >
                            {exec.profitMargin.toFixed(1)}%
                          </span>
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

        {activeTab === 'dynamics' && (
          <div className={styles.dynamicsSection}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📊 Динамика расходов по месяцам</h3>
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
                            return ` ${context.dataset.label}: ${formatCurrency(value)}`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true, beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>

            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h3 className={styles.chartTitle}>📈 Динамика маржинальности</h3>
              <div className={styles.chartWrapperLarge}>
                <Line
                  data={marginChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' },
                    },
                    scales: {
                      y: { 
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: (value) => `${value}%`,
                        },
                      },
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
                    <th style={{ textAlign: 'right' }}>Тендеров</th>
                    <th style={{ textAlign: 'right' }}>Закупка</th>
                    <th style={{ textAlign: 'right' }}>Логистика</th>
                    <th style={{ textAlign: 'right' }}>Прочие</th>
                    <th style={{ textAlign: 'right' }}>Всего</th>
                    <th style={{ textAlign: 'right' }}>Контракты</th>
                    <th style={{ textAlign: 'right' }}>Маржа</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map(month => (
                    <tr key={month.month}>
                      <td><strong>{month.monthLabel}</strong></td>
                      <td style={{ textAlign: 'right' }}>{month.tendersCount}</td>
                      <td style={{ textAlign: 'right', color: '#3b82f6' }}>
                        {formatCurrency(month.purchaseCosts)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        {formatCurrency(month.logisticsCosts)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#f59e0b' }}>
                        {formatCurrency(month.otherCosts)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(month.totalCosts)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(month.contractValue)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={styles.marginBadge}
                          style={{
                            background: month.profitMargin >= 30 ? '#dcfce7' : month.profitMargin >= 15 ? '#fef3c7' : '#fee2e2',
                            color: month.profitMargin >= 30 ? '#166534' : month.profitMargin >= 15 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {month.profitMargin.toFixed(1)}%
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
        <h3 className={styles.insightsTitle}>💡 Аналитика и рекомендации</h3>
        <div className={styles.insightsList}>
          {overview.tendersCount > 0 && (
            <>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>
                  {overview.profitMargin >= 25 ? '🏆' : overview.profitMargin >= 15 ? '📈' : '⚠️'}
                </span>
                <span>
                  Средняя маржинальность <strong>{overview.profitMargin.toFixed(1)}%</strong> —{' '}
                  {overview.profitMargin >= 25 ? 'отличный результат!' : overview.profitMargin >= 15 ? 'хороший уровень' : 'требуется оптимизация расходов'}
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>💰</span>
                <span>
                  Расходы составляют <strong>{overview.costToRevenueRatio.toFixed(1)}%</strong> от выручки
                </span>
              </div>
              {overview.purchaseCosts > overview.logisticsCosts && overview.purchaseCosts > overview.otherCosts && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>📦</span>
                  <span>
                    Основная статья расходов — <strong>закупка товаров</strong> ({((overview.purchaseCosts / overview.totalCosts) * 100).toFixed(0)}%)
                  </span>
                </div>
              )}
              {data.lowMarginTenders.length > 0 && (
                <div className={styles.insightItem}>
                  <span className={styles.insightIcon}>🚨</span>
                  <span style={{ color: '#dc2626' }}>
                    <strong>{data.lowMarginTenders.length} тендеров</strong> с маржой ниже 20% — требуют анализа
                  </span>
                </div>
              )}
              <div className={styles.insightItem}>
                <span className={styles.insightIcon}>📊</span>
                <span>
                  Средний расход на тендер: <strong>{formatCurrency(overview.avgCostPerTender)}</strong>
                </span>
              </div>
            </>
          )}
          {overview.tendersCount === 0 && (
            <div className={styles.insightItem}>
              <span className={styles.insightIcon}>📭</span>
              <span>Нет данных о расходах за выбранный период</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
