'use client';

import { useState, useEffect } from 'react';
import styles from './EmployeeActivityChart.module.css';

interface ActivityData {
  month: string;
  tenders_count: number;
  won_count: number;
  lost_count: number;
}

interface EmployeeActivityChartProps {
  employeeId: string;
}

export function EmployeeActivityChart({ employeeId }: EmployeeActivityChartProps) {
  const [data, setData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/activity`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error loading activity:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [employeeId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка графика...
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

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <p>Нет данных для отображения</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.tenders_count), 1);

  return (
    <div className={styles.container}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#3b82f6' }}></span>
          Всего тендеров
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#22c55e' }}></span>
          Выиграно
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#ef4444' }}></span>
          Проиграно
        </div>
      </div>

      <div className={styles.chart}>
        {data.map((item, index) => (
          <div key={index} className={styles.barGroup}>
            <div className={styles.bars}>
              <div 
                className={styles.bar}
                style={{ 
                  height: `${(item.tenders_count / maxValue) * 100}%`,
                  background: '#3b82f6'
                }}
                title={`Всего: ${item.tenders_count}`}
              >
                {item.tenders_count > 0 && (
                  <span className={styles.barValue}>{item.tenders_count}</span>
                )}
              </div>
              <div 
                className={styles.bar}
                style={{ 
                  height: `${(item.won_count / maxValue) * 100}%`,
                  background: '#22c55e'
                }}
                title={`Выиграно: ${item.won_count}`}
              >
                {item.won_count > 0 && (
                  <span className={styles.barValue}>{item.won_count}</span>
                )}
              </div>
              <div 
                className={styles.bar}
                style={{ 
                  height: `${(item.lost_count / maxValue) * 100}%`,
                  background: '#ef4444'
                }}
                title={`Проиграно: ${item.lost_count}`}
              >
                {item.lost_count > 0 && (
                  <span className={styles.barValue}>{item.lost_count}</span>
                )}
              </div>
            </div>
            <div className={styles.barLabel}>{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
