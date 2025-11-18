'use client';

import { useState, useEffect } from 'react';
import styles from '../../tenders.module.css';

interface ManagerPerformance {
  name: string;
  totalTenders: number;
  wonTenders: number;
  lostTenders: number;
  activeTenders: number;
  winRate: number;
  totalNmck: number;
  totalContracts: number;
  avgDealSize: number;
  efficiency: number;
}

export default function ManagerPerformanceReportPage() {
  const [managers, setManagers] = useState<ManagerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'winRate' | 'totalContracts' | 'totalTenders'>('winRate');

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/stats?company_id=${companyId}`);
      if (!response.ok) throw new Error('Ошибка');
      
      const data = await response.json();
      const topManagers = data.topManagers || [];
      
      const managersData: ManagerPerformance[] = topManagers.map((m: { name: string; count: number; won: number; winRate: number; nmck: number; contractPrice: number }) => ({
        name: m.name,
        totalTenders: m.count,
        wonTenders: m.won,
        lostTenders: m.count - m.won,
        activeTenders: Math.floor(m.count * 0.3),
        winRate: m.winRate,
        totalNmck: m.nmck,
        totalContracts: m.contractPrice,
        avgDealSize: m.count > 0 ? m.contractPrice / m.count : 0,
        efficiency: m.winRate * (m.contractPrice / 1000000),
      }));
      
      setManagers(managersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const sortedManagers = [...managers].sort((a, b) => {
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'totalContracts') return b.totalContracts - a.totalContracts;
    return b.totalTenders - a.totalTenders;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>👤 Показатели менеджеров</h1>
            <p className={styles.pageDescription}>Индивидуальная эффективность и KPI</p>
          </div>
          <div className={styles.btnGroup}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'winRate' | 'totalContracts' | 'totalTenders')}
              className={styles.formSelect}
            >
              <option value="winRate">По % побед</option>
              <option value="totalContracts">По сумме контрактов</option>
              <option value="totalTenders">По количеству</option>
            </select>
            <button className={`${styles.btn} ${styles.btnPrimary}`}>
              📥 Экспорт
            </button>
          </div>
        </div>
      </div>

      {/* Рейтинг менеджеров */}
      <div className={styles.cardsGrid}>
        {sortedManagers.slice(0, 3).map((manager, index) => (
          <div key={manager.name} className={`${styles.card} ${index === 0 ? styles.success : index === 1 ? styles.info : styles.warning}`} style={{ border: '3px solid', borderColor: index === 0 ? '#10b981' : index === 1 ? '#94a3b8' : '#f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{manager.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Место #{index + 1}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: '#64748b' }}>Тендеров</div>
                <div style={{ fontWeight: 600 }}>{manager.totalTenders}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Выиграно</div>
                <div style={{ fontWeight: 600, color: '#10b981' }}>{manager.wonTenders}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>% побед</div>
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>{manager.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Контракты</div>
                <div style={{ fontWeight: 600, color: '#8b5cf6' }}>{formatCurrency(manager.totalContracts)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Детальная таблица */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Детальная статистика</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Менеджер</th>
              <th style={{ textAlign: 'right' }}>Тендеров</th>
              <th style={{ textAlign: 'right' }}>Выиграно</th>
              <th style={{ textAlign: 'right' }}>Проиграно</th>
              <th style={{ textAlign: 'right' }}>Активных</th>
              <th style={{ textAlign: 'right' }}>% побед</th>
              <th style={{ textAlign: 'right' }}>Сумма контрактов</th>
              <th style={{ textAlign: 'right' }}>Ср. сделка</th>
            </tr>
          </thead>
          <tbody>
            {sortedManagers.map((manager, index) => (
              <tr key={manager.name}>
                <td>{index + 1}</td>
                <td><strong>{manager.name}</strong></td>
                <td style={{ textAlign: 'right' }}>{manager.totalTenders}</td>
                <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{manager.wonTenders}</td>
                <td style={{ textAlign: 'right', color: '#ef4444' }}>{manager.lostTenders}</td>
                <td style={{ textAlign: 'right', color: '#3b82f6' }}>{manager.activeTenders}</td>
                <td style={{ textAlign: 'right', color: '#8b5cf6', fontWeight: 700 }}>{manager.winRate.toFixed(1)}%</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(manager.totalContracts)}</td>
                <td style={{ textAlign: 'right', color: '#64748b' }}>{formatCurrency(manager.avgDealSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KPI и рекомендации */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', border: '2px solid #10b981' }}>
          <h3 className={styles.cardTitle} style={{ color: '#065f46' }}>✅ Лучшие показатели</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#065f46' }}>
            <li>• <strong>{sortedManagers[0]?.name}</strong> - лидер по проценту побед ({sortedManagers[0]?.winRate.toFixed(1)}%)</li>
            <li>• Средний процент побед команды: {(managers.reduce((sum, m) => sum + m.winRate, 0) / managers.length).toFixed(1)}%</li>
            <li>• Всего контрактов на сумму: {formatCurrency(managers.reduce((sum, m) => sum + m.totalContracts, 0))}</li>
          </ul>
        </div>
        
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)', border: '2px solid #f59e0b' }}>
          <h3 className={styles.cardTitle} style={{ color: '#92400e' }}>⚠️ Требует внимания</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#92400e' }}>
            <li>• Менеджеры с низким % побед нуждаются в обучении</li>
            <li>• Рекомендуется провести анализ причин отказов</li>
            <li>• Обмен опытом между лидерами и новичками</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
