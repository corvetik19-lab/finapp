'use client';

import { useState, useEffect } from 'react';
import styles from './EmployeeComparison.module.css';

interface EmployeeStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  total_tenders: number;
  won_tenders: number;
  success_rate: number;
  total_nmck: number;
}

interface EmployeeComparisonProps {
  employeeId: string;
  companyId: string;
}

export function EmployeeComparison({ employeeId, companyId }: EmployeeComparisonProps) {
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComparison = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/comparison?companyId=${companyId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        console.error('Error loading comparison:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [companyId]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка сравнения...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span>❌</span> {error}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>👥</span>
        <p>Нет данных для сравнения</p>
      </div>
    );
  }

  const maxTenders = Math.max(...employees.map(e => e.total_tenders), 1);
  const maxNmck = Math.max(...employees.map(e => e.total_nmck), 1);

  return (
    <div className={styles.container}>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <div className={styles.headerCell}>Сотрудник</div>
          <div className={styles.headerCell}>Тендеров</div>
          <div className={styles.headerCell}>Выиграно</div>
          <div className={styles.headerCell}>Успешность</div>
          <div className={styles.headerCell}>Сумма НМЦК</div>
        </div>

        {employees.map((emp, index) => (
          <div 
            key={emp.id} 
            className={`${styles.row} ${emp.id === employeeId ? styles.currentEmployee : ''}`}
          >
            <div className={styles.cell}>
              <div className={styles.rank}>#{index + 1}</div>
              <div className={styles.avatar}>
                {emp.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.avatar_url} alt={emp.full_name} />
                ) : (
                  <span>{getInitials(emp.full_name)}</span>
                )}
              </div>
              <span className={styles.name}>{emp.full_name}</span>
              {emp.id === employeeId && <span className={styles.youBadge}>Вы</span>}
            </div>
            <div className={styles.cell}>
              <div className={styles.barContainer}>
                <div 
                  className={styles.bar}
                  style={{ width: `${(emp.total_tenders / maxTenders) * 100}%` }}
                />
                <span className={styles.value}>{emp.total_tenders}</span>
              </div>
            </div>
            <div className={styles.cell}>
              <span className={styles.wonValue}>{emp.won_tenders}</span>
            </div>
            <div className={styles.cell}>
              <div className={styles.successRate}>
                <div 
                  className={styles.successBar}
                  style={{ 
                    width: `${emp.success_rate}%`,
                    background: emp.success_rate >= 50 ? '#22c55e' : emp.success_rate >= 30 ? '#f59e0b' : '#ef4444'
                  }}
                />
                <span>{emp.success_rate.toFixed(0)}%</span>
              </div>
            </div>
            <div className={styles.cell}>
              <div className={styles.barContainer}>
                <div 
                  className={styles.bar}
                  style={{ 
                    width: `${(emp.total_nmck / maxNmck) * 100}%`,
                    background: '#8b5cf6'
                  }}
                />
                <span className={styles.value}>{formatMoney(emp.total_nmck)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
