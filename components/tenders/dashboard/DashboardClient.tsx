'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardData } from '@/lib/tenders/dashboard-service';
import styles from './Dashboard.module.css';

interface Props {
  initialData: DashboardData;
  companyId: string;
}

export default function DashboardClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/tenders/dashboard?company_id=${companyId}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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
      day: 'numeric',
      month: 'short',
    });
  };

  const { overview, byStage, byType, monthly, topManagers, recentTenders, upcomingDeadlines, taskSummary } = data;

  // Calculate max values for charts
  const maxMonthlyCount = Math.max(...monthly.map(m => m.count), 1);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <span className={styles.headerIcon}>📊</span>
            Дашборд тендеров
          </h1>
          <p>Аналитика и ключевые показатели эффективности</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshBtn} 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? '⏳' : '🔄'} Обновить
          </button>
          <Link href="/tenders/department" className={styles.primaryBtn}>
            📋 К тендерам
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard} style={{ '--kpi-color': '#3b82f6', '--kpi-bg': '#dbeafe' } as React.CSSProperties}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>📋</div>
            {overview.activeTenders > 0 && (
              <span className={`${styles.kpiTrend} ${styles.kpiTrendUp}`}>
                {overview.activeTenders} активных
              </span>
            )}
          </div>
          <div className={styles.kpiValue}>{overview.totalTenders}</div>
          <div className={styles.kpiLabel}>Всего тендеров</div>
          <div className={styles.kpiSubtext}>На рассмотрении: {overview.pendingTenders}</div>
        </div>

        <div className={styles.kpiCard} style={{ '--kpi-color': '#10b981', '--kpi-bg': '#d1fae5' } as React.CSSProperties}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>🏆</div>
            <span className={`${styles.kpiTrend} ${overview.winRate >= 50 ? styles.kpiTrendUp : styles.kpiTrendDown}`}>
              {overview.winRate.toFixed(0)}% побед
            </span>
          </div>
          <div className={styles.kpiValue}>{overview.wonTenders}</div>
          <div className={styles.kpiLabel}>Выиграно</div>
          <div className={styles.kpiSubtext}>Проиграно: {overview.lostTenders}</div>
        </div>

        <div className={styles.kpiCard} style={{ '--kpi-color': '#8b5cf6', '--kpi-bg': '#ede9fe' } as React.CSSProperties}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>💰</div>
          </div>
          <div className={styles.kpiValue}>{formatCurrency(overview.totalNmck)}</div>
          <div className={styles.kpiLabel}>Общая НМЦК</div>
          <div className={styles.kpiSubtext}>Контракты: {formatCurrency(overview.totalContractPrice)}</div>
        </div>

        <div className={styles.kpiCard} style={{ '--kpi-color': '#f59e0b', '--kpi-bg': '#fef3c7' } as React.CSSProperties}>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiIcon}>💎</div>
            {overview.totalNmck > 0 && (
              <span className={`${styles.kpiTrend} ${styles.kpiTrendUp}`}>
                {((overview.totalSavings / overview.totalNmck) * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <div className={styles.kpiValue}>{formatCurrency(overview.totalSavings)}</div>
          <div className={styles.kpiLabel}>Экономия</div>
          <div className={styles.kpiSubtext}>Средний контракт: {formatCurrency(overview.avgContractValue)}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* By Stage */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>📈</span>
              По этапам
            </h3>
          </div>
          <div className={styles.cardBody}>
            {byStage.length > 0 ? (
              byStage.map(stage => (
                <div key={stage.stage} className={styles.progressItem}>
                  <div className={styles.progressHeader}>
                    <div className={styles.progressLabel}>
                      <span className={styles.progressDot} style={{ background: stage.color }} />
                      <span className={styles.progressName}>{stage.stage}</span>
                    </div>
                    <span className={styles.progressValue}>{stage.count}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ 
                        width: `${stage.percent}%`,
                        background: stage.color,
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <p className={styles.emptyText}>Нет данных</p>
              </div>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>🏷️</span>
              По типам
            </h3>
          </div>
          <div className={styles.cardBody}>
            {byType.length > 0 ? (
              byType.map((type, idx) => {
                const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                const color = colors[idx % colors.length];
                return (
                  <div key={type.type} className={styles.progressItem}>
                    <div className={styles.progressHeader}>
                      <div className={styles.progressLabel}>
                        <span className={styles.progressDot} style={{ background: color }} />
                        <span className={styles.progressName}>{type.type}</span>
                      </div>
                      <span className={styles.progressValue}>{type.count}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ 
                          width: `${type.percent}%`,
                          background: color,
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏷️</div>
                <p className={styles.emptyText}>Нет данных</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className={styles.card} style={{ marginBottom: 24 }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span className={styles.cardTitleIcon}>📅</span>
            Динамика за 12 месяцев
          </h3>
          <div className={styles.cardActions}>
            <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981' }} />
                Победы
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                Проигрыши
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: '#94a3b8' }} />
                В работе
              </span>
            </span>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.monthlyChart}>
            {monthly.map(month => {
              const other = month.count - month.won - month.lost;
              const wonHeight = (month.won / maxMonthlyCount) * 100;
              const lostHeight = (month.lost / maxMonthlyCount) * 100;
              const otherHeight = (other / maxMonthlyCount) * 100;
              
              return (
                <div key={month.monthKey} className={styles.monthBar} title={`${month.month}: ${month.count} тендеров`}>
                  <div className={styles.monthBarContainer}>
                    {month.won > 0 && (
                      <div 
                        className={styles.monthBarWon} 
                        style={{ height: `${wonHeight}%` }}
                        title={`Выиграно: ${month.won}`}
                      />
                    )}
                    {other > 0 && (
                      <div 
                        className={styles.monthBarOther} 
                        style={{ height: `${otherHeight}%` }}
                        title={`В работе: ${other}`}
                      />
                    )}
                    {month.lost > 0 && (
                      <div 
                        className={styles.monthBarLost} 
                        style={{ height: `${lostHeight}%` }}
                        title={`Проиграно: ${month.lost}`}
                      />
                    )}
                  </div>
                  <span className={styles.monthLabel}>
                    {month.month.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Recent + Deadlines + Tasks */}
      <div className={styles.mainGrid}>
        {/* Recent Tenders */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>🕐</span>
              Последние тендеры
            </h3>
            <Link href="/tenders/list" className={styles.cardBtn}>
              Все тендеры →
            </Link>
          </div>
          {recentTenders.length > 0 ? (
            <div className={styles.tendersList}>
              {recentTenders.map(tender => (
                <Link 
                  key={tender.id} 
                  href={`/tenders/${tender.id}`}
                  className={styles.tenderItem}
                >
                  <div 
                    className={styles.tenderStage} 
                    style={{ background: tender.stageColor }}
                  />
                  <div className={styles.tenderInfo}>
                    <div className={styles.tenderCustomer}>{tender.customer}</div>
                    <div className={styles.tenderSubject}>{tender.subject}</div>
                  </div>
                  <div className={styles.tenderMeta}>
                    <div className={styles.tenderNmck}>{formatCurrency(tender.nmck)}</div>
                    <div className={styles.tenderDate}>{formatDate(tender.createdAt)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyTitle}>Нет тендеров</p>
              <p className={styles.emptyText}>Создайте первый тендер</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Upcoming Deadlines */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}>⏰</span>
                Ближайшие сроки
              </h3>
            </div>
            {upcomingDeadlines.length > 0 ? (
              <div className={styles.deadlinesList}>
                {upcomingDeadlines.map(deadline => (
                  <Link 
                    key={deadline.id}
                    href={`/tenders/${deadline.id}`}
                    className={styles.deadlineItem}
                  >
                    <div className={`${styles.deadlineDays} ${
                      deadline.daysLeft <= 2 ? styles.deadlineDaysUrgent :
                      deadline.daysLeft <= 5 ? styles.deadlineDaysWarning :
                      styles.deadlineDaysNormal
                    }`}>
                      <span className={styles.deadlineDaysNumber}>{deadline.daysLeft}</span>
                      <span className={styles.deadlineDaysLabel}>
                        {deadline.daysLeft === 1 ? 'день' : 
                         deadline.daysLeft < 5 ? 'дня' : 'дней'}
                      </span>
                    </div>
                    <div className={styles.deadlineInfo}>
                      <div className={styles.deadlineCustomer}>{deadline.customer}</div>
                      <div className={styles.deadlineNumber}>{deadline.purchaseNumber}</div>
                    </div>
                    <span 
                      className={styles.deadlineStageBadge}
                      style={{ background: deadline.stageColor }}
                    >
                      {deadline.stage}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✅</div>
                <p className={styles.emptyText}>Нет срочных дел</p>
              </div>
            )}
          </div>

          {/* Tasks Summary */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}>✅</span>
                Задачи
              </h3>
              <Link href="/tenders/tasks" className={styles.cardBtn}>
                Все задачи →
              </Link>
            </div>
            <div className={styles.tasksSummary}>
              <div className={styles.taskStat}>
                <div className={styles.taskStatValue}>{taskSummary.total}</div>
                <div className={styles.taskStatLabel}>Всего</div>
              </div>
              <div className={`${styles.taskStat} ${styles.taskStatInProgress}`}>
                <div className={styles.taskStatValue}>{taskSummary.inProgress}</div>
                <div className={styles.taskStatLabel}>В работе</div>
              </div>
              <div className={`${styles.taskStat} ${styles.taskStatCompleted}`}>
                <div className={styles.taskStatValue}>{taskSummary.completed}</div>
                <div className={styles.taskStatLabel}>Выполнено</div>
              </div>
              <div className={`${styles.taskStat} ${styles.taskStatOverdue}`}>
                <div className={styles.taskStatValue}>{taskSummary.overdue}</div>
                <div className={styles.taskStatLabel}>Просрочено</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Managers + Quick Actions */}
      <div className={styles.bottomGrid}>
        {/* Top Managers */}
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>🏆</span>
              Топ менеджеров
            </h3>
          </div>
          {topManagers.length > 0 ? (
            <div className={styles.managersList}>
              {topManagers.map((manager, idx) => (
                <div key={manager.id} className={styles.managerItem}>
                  <div className={`${styles.managerRank} ${
                    idx === 0 ? styles.managerRank1 :
                    idx === 1 ? styles.managerRank2 :
                    idx === 2 ? styles.managerRank3 :
                    styles.managerRankOther
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className={styles.managerAvatar}>
                    {manager.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className={styles.managerInfo}>
                    <div className={styles.managerName}>{manager.name}</div>
                    <div className={styles.managerStats}>
                      <span>📋 {manager.totalTenders} тендеров</span>
                      <span>🏆 {manager.wonTenders} побед</span>
                      <span>💰 {formatCurrency(manager.totalContractValue)}</span>
                    </div>
                  </div>
                  <div className={`${styles.managerWinRate} ${
                    manager.winRate >= 60 ? styles.winRateHigh :
                    manager.winRate >= 40 ? styles.winRateMedium :
                    styles.winRateLow
                  }`}>
                    {manager.winRate.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <p className={styles.emptyText}>Нет данных о менеджерах</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>⚡</span>
              Быстрые действия
            </h3>
          </div>
          <div className={styles.quickActions}>
            <Link href="/tenders/department" className={styles.quickAction}>
              <span className={styles.quickActionIcon} style={{ background: '#dbeafe' }}>📝</span>
              <span className={styles.quickActionLabel}>Новый тендер</span>
            </Link>
            <Link href="/tenders/tasks" className={styles.quickAction}>
              <span className={styles.quickActionIcon} style={{ background: '#d1fae5' }}>✅</span>
              <span className={styles.quickActionLabel}>Задачи</span>
            </Link>
            <Link href="/tenders/calendar" className={styles.quickAction}>
              <span className={styles.quickActionIcon} style={{ background: '#fef3c7' }}>📅</span>
              <span className={styles.quickActionLabel}>Календарь</span>
            </Link>
            <Link href="/tenders/list" className={styles.quickAction}>
              <span className={styles.quickActionIcon} style={{ background: '#ede9fe' }}>📋</span>
              <span className={styles.quickActionLabel}>Реестр</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
