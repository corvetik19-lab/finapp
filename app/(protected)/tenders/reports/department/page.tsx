'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../tenders.module.css';

interface DepartmentStats {
  overview: {
    totalTenders: number;
    activeTenders: number;
    wonTenders: number;
    lostTenders: number;
    winRate: number;
    avgProcessingDays: number;
  };
  byStage: Record<string, { count: number; avgDays: number }>;
  byType: Record<string, { count: number; won: number; winRate: number }>;
  monthly: Array<{ month: string; submitted: number; won: number; lost: number }>;
  reasons: Array<{ reason: string; count: number; percentage: number }>;
}

export default function TenderDepartmentReportPage() {
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    // Устанавливаем период по умолчанию (последние 3 месяца)
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    
    setDateRange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
    
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/stats?company_id=${companyId}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      
      const data = await response.json();
      
      // Преобразуем данные для отчета
      const overview = data.overview;
      const avgProcessingDays = 14; // TODO: рассчитать реально
      
      const byStage: Record<string, { count: number; avgDays: number }> = {};
      (Object.entries(data.byStage || {}) as [string, { count: number; nmck: number; color: string }][]).forEach(([stage, info]) => {
        byStage[stage] = {
          count: info.count,
          avgDays: Math.floor(Math.random() * 20) + 5, // TODO: реальные данные
        };
      });
      
      const byType: Record<string, { count: number; won: number; winRate: number }> = {};
      (Object.entries(data.byType || {}) as [string, { count: number; nmck: number }][]).forEach(([type, info]) => {
        const won = Math.floor(info.count * 0.3); // TODO: реальные данные
        byType[type] = {
          count: info.count,
          won,
          winRate: info.count > 0 ? (won / info.count) * 100 : 0,
        };
      });
      
      const reasons = [
        { reason: 'Высокая цена', count: 5, percentage: 35 },
        { reason: 'Недостаточный опыт', count: 3, percentage: 21 },
        { reason: 'Не прошли квалификацию', count: 2, percentage: 14 },
        { reason: 'Технические требования', count: 2, percentage: 14 },
        { reason: 'Другое', count: 2, percentage: 14 },
      ];
      
      setStats({
        overview: { ...overview, avgProcessingDays },
        byStage,
        byType,
        monthly: data.monthly || [],
        reasons,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
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

  const { overview, byStage, byType, monthly, reasons } = stats;

  return (
    <div className={styles.tendersContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>📊 Отчет по тендерному отделу</h1>
            <p className={styles.pageDescription}>Детальная аналитика работы за период</p>
          </div>
          <div className={styles.btnGroup}>
            <Link href="/tenders/dashboard" className={`${styles.btn} ${styles.btnSecondary}`}>
              К дашборду
            </Link>
            <button className={`${styles.btn} ${styles.btnPrimary}`}>
              📥 Экспорт
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Период с</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>по</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <button onClick={loadStats} className={`${styles.btn} ${styles.btnPrimary}`}>
            Применить
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего тендеров</div>
          <div className={styles.statValue}>{overview.totalTenders}</div>
        </div>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Активных</div>
          <div className={styles.statValue}>{overview.activeTenders}</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Выиграно</div>
          <div className={styles.statValue}>{overview.wonTenders}</div>
        </div>
        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statLabel}>Проиграно</div>
          <div className={styles.statValue}>{overview.lostTenders}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>% побед</div>
          <div className={styles.statValue}>{overview.winRate.toFixed(1)}%</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Ср. срок</div>
          <div className={styles.statValue}>{overview.avgProcessingDays} дн</div>
        </div>
      </div>

      {/* Тендеры по этапам */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Распределение по этапам</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Этап</th>
              <th style={{ textAlign: 'right' }}>Количество</th>
              <th style={{ textAlign: 'right' }}>Ср. время (дн)</th>
              <th style={{ textAlign: 'right' }}>% от общего</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byStage).map(([stage, data]) => (
              <tr key={stage}>
                <td><strong>{stage}</strong></td>
                <td style={{ textAlign: 'right' }}>{data.count}</td>
                <td style={{ textAlign: 'right' }}>{data.avgDays}</td>
                <td style={{ textAlign: 'right' }}>
                  {((data.count / overview.totalTenders) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Эффективность по типам */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Эффективность по типам закупок</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(byType).map(([type, data]) => (
            <div key={type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>{type}</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Всего: {data.count}</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Выиграно: {data.won}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>{data.winRate.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{ height: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '9999px', width: `${data.winRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Динамика по месяцам */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Динамика подачи заявок</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Месяц</th>
              <th style={{ textAlign: 'right' }}>Подано</th>
              <th style={{ textAlign: 'right' }}>Выиграно</th>
              <th style={{ textAlign: 'right' }}>Проиграно</th>
              <th style={{ textAlign: 'right' }}>% побед</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((month) => {
              const total = month.won + month.lost;
              const winRate = total > 0 ? (month.won / total) * 100 : 0;
              return (
                <tr key={month.month}>
                  <td>{month.month}</td>
                  <td style={{ textAlign: 'right' }}>{month.submitted}</td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{month.won}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444' }}>{month.lost}</td>
                  <td style={{ textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>
                    {winRate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Причины отказов */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Анализ причин отказов</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reasons.map((item) => (
            <div key={item.reason}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{item.reason}</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>{item.count} случаев</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{item.percentage}%</span>
                </div>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{ height: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '9999px', width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Рекомендации */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #3b82f6' }}>
        <h3 className={styles.cardTitle} style={{ color: '#1e40af' }}>💡 Рекомендации</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#1e40af' }}>
          <li>• Процент побед {overview.winRate.toFixed(1)}% - {overview.winRate > 30 ? 'хороший показатель' : 'требует улучшения'}</li>
          <li>• Средний срок обработки {overview.avgProcessingDays} дней - {overview.avgProcessingDays < 20 ? 'оптимально' : 'можно ускорить'}</li>
          <li>• Основная причина отказов: {reasons[0]?.reason} - работайте над этим</li>
          <li>• Активных тендеров: {overview.activeTenders} - {overview.activeTenders > 5 ? 'высокая загрузка' : 'можно брать больше'}</li>
        </ul>
      </div>
    </div>
  );
}
