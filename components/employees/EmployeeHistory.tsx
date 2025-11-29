'use client';

import { useState, useEffect } from 'react';
import styles from './EmployeeHistory.module.css';

interface HistoryItem {
  id: string;
  action: 'created' | 'updated' | 'role_changed' | 'status_changed' | 'deleted';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  comment: string | null;
  changed_by: string | null;
}

interface EmployeeHistoryProps {
  employeeId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Создан',
  updated: 'Изменён',
  role_changed: 'Изменена роль',
  status_changed: 'Изменён статус',
  deleted: 'Удалён',
};

const ACTION_ICONS: Record<string, string> = {
  created: '✨',
  updated: '✏️',
  role_changed: '🔐',
  status_changed: '🔄',
  deleted: '🗑️',
};

const FIELD_LABELS: Record<string, string> = {
  full_name: 'ФИО',
  email: 'Email',
  phone: 'Телефон',
  position: 'Должность',
  department: 'Отдел',
  role: 'Роль',
  role_id: 'Роль',
  status: 'Статус',
  hire_date: 'Дата приёма',
  telegram: 'Telegram',
  avatar_url: 'Фото',
};

export function EmployeeHistory({ employeeId }: EmployeeHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/history`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки истории');
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error('Error loading history:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [employeeId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка истории...
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

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📋</span>
        <p>История изменений пуста</p>
        <p className={styles.emptyHint}>Здесь будут отображаться все изменения данных сотрудника</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {history.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.icon}>
              {ACTION_ICONS[item.action] || '📝'}
            </div>
            <div className={styles.content}>
              <div className={styles.header}>
                <span className={styles.action}>
                  {ACTION_LABELS[item.action] || item.action}
                </span>
                <span className={styles.date}>
                  {new Date(item.changed_at).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {item.field_name && (
                <div className={styles.field}>
                  <span className={styles.fieldName}>
                    {FIELD_LABELS[item.field_name] || item.field_name}:
                  </span>
                  {item.old_value && (
                    <span className={styles.oldValue}>{item.old_value}</span>
                  )}
                  {item.old_value && item.new_value && (
                    <span className={styles.arrow}>→</span>
                  )}
                  {item.new_value && (
                    <span className={styles.newValue}>{item.new_value}</span>
                  )}
                </div>
              )}

              {item.comment && (
                <div className={styles.comment}>
                  💬 {item.comment}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
