'use client';

import { useState, useEffect } from 'react';
import styles from './EmployeeTendersKanban.module.css';

interface Tender {
  id: string;
  number: string;
  name: string;
  status: string;
  nmck: number;
  deadline: string | null;
}

interface EmployeeTendersKanbanProps {
  employeeId: string;
}

const KANBAN_COLUMNS = [
  { id: 'draft', label: 'Черновик', color: '#94a3b8', icon: '📝' },
  { id: 'preparation', label: 'Подготовка', color: '#f59e0b', icon: '⚙️' },
  { id: 'submitted', label: 'Подана', color: '#3b82f6', icon: '📤' },
  { id: 'consideration', label: 'Рассмотрение', color: '#8b5cf6', icon: '🔍' },
  { id: 'won', label: 'Выиграна', color: '#22c55e', icon: '🏆' },
  { id: 'lost', label: 'Проиграна', color: '#ef4444', icon: '❌' },
];

export function EmployeeTendersKanban({ employeeId }: EmployeeTendersKanbanProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenders = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/tenders`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки тендеров');
        }

        const data = await response.json();
        setTenders(data);
      } catch (err) {
        console.error('Error loading tenders:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadTenders();
  }, [employeeId]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const getTendersByStatus = (status: string) => {
    return tenders.filter(t => t.status === status);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка канбана...
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

  if (tenders.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📋</span>
        <p>Нет назначенных тендеров</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.board}>
        {KANBAN_COLUMNS.map((column) => {
          const columnTenders = getTendersByStatus(column.id);
          return (
            <div key={column.id} className={styles.column}>
              <div 
                className={styles.columnHeader}
                style={{ borderTopColor: column.color }}
              >
                <span className={styles.columnIcon}>{column.icon}</span>
                <span className={styles.columnLabel}>{column.label}</span>
                <span 
                  className={styles.columnCount}
                  style={{ background: column.color }}
                >
                  {columnTenders.length}
                </span>
              </div>
              <div className={styles.columnContent}>
                {columnTenders.map((tender) => (
                  <a 
                    key={tender.id} 
                    href={`/tenders/${tender.id}`}
                    className={styles.card}
                  >
                    <div className={styles.cardNumber}>
                      #{tender.number}
                    </div>
                    <div className={styles.cardName}>
                      {tender.name}
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardNmck}>
                        {formatMoney(tender.nmck)}
                      </span>
                      {tender.deadline && (
                        <span className={styles.cardDeadline}>
                          📅 {new Date(tender.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
                {columnTenders.length === 0 && (
                  <div className={styles.emptyColumn}>
                    Нет тендеров
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
