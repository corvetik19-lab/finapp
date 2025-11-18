'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '../tenders.module.css';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date: string | null;
  assigned_to: string | null;
  tender_id: string | null;
  created_at: string;
}

export default function TenderTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === 'all'
        ? `/api/tenders/tasks?company_id=${companyId}`
        : `/api/tenders/tasks?company_id=${companyId}&status=${filter}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed');
      
      const data = await response.json();
      setTasks(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: styles.badgeDanger,
      high: styles.badgeWarning,
      normal: styles.badgeInfo,
      low: '',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: styles.badgeWarning,
      in_progress: styles.badgeInfo,
      completed: styles.badgeSuccess,
      cancelled: '',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      completed: 'Завершено',
      cancelled: 'Отменено',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      urgent: 'Срочно',
      high: 'Высокий',
      normal: 'Обычный',
      low: 'Низкий',
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className={styles.tendersContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
        </div>
      </div>
    );
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t.due_date, t.status)).length,
  };

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>✅ Задачи</h1>
          <p className={styles.pageDescription}>
            Всего: {stats.total} • В работе: {stats.in_progress} • Просрочено: {stats.overdue}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          + Создать задачу
        </button>
      </div>

      {/* Статистика */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>Всего</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={`${styles.statCard} ${styles.warning}`}>
          <div className={styles.statLabel}>Ожидают</div>
          <div className={styles.statValue}>{stats.pending}</div>
        </div>
        <div className={`${styles.statCard} ${styles.info}`}>
          <div className={styles.statLabel}>В работе</div>
          <div className={styles.statValue}>{stats.in_progress}</div>
        </div>
        <div className={`${styles.statCard} ${styles.success}`}>
          <div className={styles.statLabel}>Завершено</div>
          <div className={styles.statValue}>{stats.completed}</div>
        </div>
        <div className={`${styles.statCard} ${styles.danger}`}>
          <div className={styles.statLabel}>Просрочено</div>
          <div className={styles.statValue}>{stats.overdue}</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles.btnGroup}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Ожидают
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={filter === 'in_progress' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          В работе
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
        >
          Завершено
        </button>
      </div>

      {/* Список задач */}
      {tasks.length === 0 ? (
        <div className={styles.card} style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
            {filter === 'all' ? 'Нет задач' : `Нет задач со статусом "${getStatusLabel(filter)}"`}
          </h3>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>
            Создайте первую задачу для начала работы
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            + Создать задачу
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map((task) => {
            const overdue = isOverdue(task.due_date, task.status);
            return (
              <div
                key={task.id}
                className={styles.card}
                style={{
                  borderColor: overdue ? '#fca5a5' : undefined,
                  backgroundColor: overdue ? '#fef2f2' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontWeight: 600, color: '#1e293b' }}>{task.title}</h3>
                      {overdue && (
                        <span className={styles.badgeDanger}>
                          Просрочено
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                      <span>Создано: {formatDate(task.created_at)}</span>
                      {task.due_date && (
                        <span style={{ color: overdue ? '#ef4444' : undefined, fontWeight: overdue ? 600 : undefined }}>
                          Срок: {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.tender_id && (
                        <Link
                          href={`/tenders/${task.tender_id}`}
                          style={{ color: '#3b82f6', textDecoration: 'none' }}
                        >
                          Перейти к тендеру →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className={`${styles.badge} ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <span className={`${styles.badge} ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно создания (заглушка) */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className={styles.card} style={{ maxWidth: '28rem', width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Создание задачи</h2>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
              Форма создания задачи будет реализована в следующей версии
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ width: '100%' }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
