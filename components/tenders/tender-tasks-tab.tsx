'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import styles from './tender-tasks-tab.module.css';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  assignee_name?: string;
  due_date?: string;
  due_time?: string;
  created_at: string;
  updated_at?: string;
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  comment: string;
  created_at: string;
}

interface TenderTasksTabProps {
  tender: Tender;
}

export function TenderTasksTab({ tender }: TenderTasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const toast = useToast();
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_time: string;
  }>({ 
    title: '', 
    description: '', 
    status: 'pending',
    priority: 'medium',
    due_time: ''
  });

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tender.id}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [tender.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.show('Введите название задачи', { type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      const data = await response.json();

      if (response.ok) {
        setNewTask({ title: '', description: '', status: 'pending', priority: 'medium', due_time: '' });
        setShowAddForm(false);
        await loadTasks();
        toast.show('Задача успешно создана', { type: 'success' });
      } else {
        toast.show(`Ошибка: ${data.error || 'Не удалось создать задачу'}`, { type: 'error' });
      }
    } catch (error) {
      console.error('Error adding task:', error);
      toast.show('Ошибка при создании задачи', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) {
      toast.show('Введите название задачи', { type: 'error' });
      return;
    }

    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          due_time: editingTask.due_time || null,
        }),
      });

      if (response.ok) {
        setEditingTask(null);
        await loadTasks();
        toast.show('Задача обновлена', { type: 'success' });
      } else {
        const data = await response.json();
        toast.show(`Ошибка: ${data.error || 'Не удалось обновить задачу'}`, { type: 'error' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.show('Ошибка при обновлении задачи', { type: 'error' });
    }
  };

  const handleUpdateStatus = async (taskId: string, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await loadTasks();
        const statusLabels = {
          pending: 'Ожидает',
          in_progress: 'В работе',
          completed: 'Завершена',
        };
        toast.show(`Статус изменён на "${statusLabels[status]}"`, { type: 'success' });
      } else {
        const data = await response.json();
        toast.show(`Ошибка: ${data.error || 'Не удалось изменить статус'}`, { type: 'error' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.show('Ошибка при изменении статуса', { type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Удалить задачу?')) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTasks();
        toast.show('Задача удалена', { type: 'success' });
      } else {
        const data = await response.json();
        toast.show(`Ошибка: ${data.error || 'Не удалось удалить задачу'}`, { type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.show('Ошибка при удалении задачи', { type: 'error' });
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    const labels = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      completed: 'Завершена',
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    const labels = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
    };
    return labels[priority];
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const loadComments = async (taskId: string) => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({ ...prev, [taskId]: data }));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        await loadComments(taskId);
        toast.show('Комментарий добавлен', { type: 'success' });
      } else {
        toast.show('Ошибка при добавлении комментария', { type: 'error' });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.show('Ошибка при добавлении комментария', { type: 'error' });
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadComments(taskId);
        toast.show('Комментарий удалён', { type: 'success' });
      } else {
        toast.show('Ошибка при удалении комментария', { type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.show('Ошибка при удалении комментария', { type: 'error' });
    }
  };

  const toggleComments = async (taskId: string) => {
    if (selectedTaskForComments === taskId) {
      setSelectedTaskForComments(null);
    } else {
      setSelectedTaskForComments(taskId);
      if (!comments[taskId]) {
        await loadComments(taskId);
      }
    }
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filterStatus);

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Загрузка задач...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Задачи</h3>
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{taskStats.total}</span>
              <span className={styles.statLabel}>Всего</span>
            </span>
            <span className={`${styles.statItem} ${styles.statPending}`}>
              <span className={styles.statValue}>{taskStats.pending}</span>
              <span className={styles.statLabel}>Ожидает</span>
            </span>
            <span className={`${styles.statItem} ${styles.statInProgress}`}>
              <span className={styles.statValue}>{taskStats.in_progress}</span>
              <span className={styles.statLabel}>В работе</span>
            </span>
            <span className={`${styles.statItem} ${styles.statCompleted}`}>
              <span className={styles.statValue}>{taskStats.completed}</span>
              <span className={styles.statLabel}>Завершено</span>
            </span>
          </div>
        </div>
        <button 
          className={`${styles.addButton} ${showAddForm ? styles.addButtonActive : ''}`}
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingTask(null);
          }}
        >
          {showAddForm ? (
            <>
              <span className={styles.buttonIcon}>✕</span>
              Отмена
            </>
          ) : (
            <>
              <span className={styles.buttonIcon}>+</span>
              Добавить задачу
            </>
          )}
        </button>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filterStatus === 'all' ? styles.filterButtonActive : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          Все ({taskStats.total})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'pending' ? styles.filterButtonActive : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          Ожидает ({taskStats.pending})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'in_progress' ? styles.filterButtonActive : ''}`}
          onClick={() => setFilterStatus('in_progress')}
        >
          В работе ({taskStats.in_progress})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'completed' ? styles.filterButtonActive : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          Завершено ({taskStats.completed})
        </button>
      </div>

      {showAddForm && (
        <div className={styles.taskForm}>
          <div className={styles.formHeader}>
            <h4>Новая задача</h4>
          </div>
          <div className={styles.formBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Название задачи *</label>
              <input
                type="text"
                placeholder="Введите название задачи"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className={styles.formInput}
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Описание</label>
              <textarea
                placeholder="Добавьте описание задачи (необязательно)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className={styles.formTextarea}
                rows={3}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Приоритет</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className={styles.formSelect}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Время выполнения</label>
                <input
                  type="time"
                  value={newTask.due_time}
                  onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                  className={styles.formInput}
                />
              </div>
            </div>
          </div>
          <div className={styles.formFooter}>
            <button 
              className={styles.cancelButton} 
              onClick={() => {
                setShowAddForm(false);
                setNewTask({ title: '', description: '', status: 'pending', priority: 'medium', due_time: '' });
              }}
            >
              Отмена
            </button>
            <button 
              className={styles.submitButton} 
              onClick={handleAddTask}
              disabled={!newTask.title.trim() || isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h4 className={styles.emptyTitle}>
            {filterStatus === 'all' ? 'Задач пока нет' : `Нет задач со статусом "${getStatusLabel(filterStatus as Task['status'])}"`}
          </h4>
          <p className={styles.emptyText}>
            {filterStatus === 'all' ? 'Добавьте первую задачу для этого тендера' : 'Попробуйте изменить фильтр'}
          </p>
        </div>
      ) : (
        <div className={styles.tasksList}>
          {filteredTasks.map((task) => (
            editingTask?.id === task.id ? (
              <div key={task.id} className={styles.taskForm}>
                <div className={styles.formHeader}>
                  <h4>Редактирование задачи</h4>
                </div>
                <div className={styles.formBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Название задачи *</label>
                    <input
                      type="text"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Описание</label>
                    <textarea
                      value={editingTask.description || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      className={styles.formTextarea}
                      rows={3}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Приоритет</label>
                      <select
                        value={editingTask.priority}
                        onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className={styles.formSelect}
                      >
                        <option value="low">Низкий</option>
                        <option value="medium">Средний</option>
                        <option value="high">Высокий</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Время выполнения</label>
                      <input
                        type="time"
                        value={editingTask.due_time || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, due_time: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.formFooter}>
                  <button className={styles.cancelButton} onClick={() => setEditingTask(null)}>
                    Отмена
                  </button>
                  <button className={styles.submitButton} onClick={handleEditTask}>
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <div key={task.id} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <div className={styles.taskHeaderLeft}>
                    <h4 className={styles.taskTitle}>{task.title}</h4>
                    <div className={styles.taskBadges}>
                      <span className={`${styles.priorityBadge} ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className={`${styles.statusBadge} ${styles[task.status === 'in_progress' ? 'inProgress' : task.status]}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.taskActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => toggleComments(task.id)}
                      title="Комментарии"
                    >
                      💬 {comments[task.id] && comments[task.id].length > 0 && (
                        <span className={styles.commentCount}>{comments[task.id].length}</span>
                      )}
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => setEditingTask(task)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDeleteTask(task.id)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {task.description && (
                  <p className={styles.taskDescription}>{task.description}</p>
                )}
                <div className={styles.taskFooter}>
                  <div className={styles.taskMeta}>
                    <span className={styles.metaItem}>
                      <span className={styles.metaIcon}>🕐</span>
                      {formatDateTime(task.created_at)}
                    </span>
                    {task.due_time && (
                      <span className={styles.metaItem}>
                        <span className={styles.metaIcon}>⏰</span>
                        Время: {task.due_time.slice(0,5)}
                      </span>
                    )}
                    {task.assignee_name && (
                      <span className={styles.metaItem}>
                        <span className={styles.metaIcon}>👤</span>
                        {task.assignee_name}
                      </span>
                    )}
                  </div>
                  <div className={styles.statusSelector}>
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value as Task['status'])}
                      className={`${styles.statusSelect} ${styles[task.status === 'in_progress' ? 'inProgress' : task.status]}`}
                    >
                      <option value="pending">Ожидает</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Завершена</option>
                    </select>
                  </div>
                </div>

                {/* Секция комментариев */}
                {selectedTaskForComments === task.id && (
                  <div className={styles.commentsSection}>
                    <div className={styles.commentsHeader}>
                      <h5>Комментарии</h5>
                    </div>
                    <div className={styles.commentsList}>
                      {loadingComments ? (
                        <p className={styles.loadingText}>Загрузка...</p>
                      ) : comments[task.id] && comments[task.id].length > 0 ? (
                        comments[task.id].map((comment) => (
                          <div key={comment.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                              <div className={styles.commentHeaderLeft}>
                                <span className={styles.commentAuthor}>{comment.user_name || 'Пользователь'}</span>
                                <span className={styles.commentDate}>{formatDateTime(comment.created_at)}</span>
                              </div>
                              <button
                                className={styles.deleteCommentButton}
                                onClick={() => handleDeleteComment(task.id, comment.id)}
                                title="Удалить комментарий"
                              >
                                🗑️
                              </button>
                            </div>
                            <p className={styles.commentText}>{comment.comment}</p>
                          </div>
                        ))
                      ) : (
                        <p className={styles.noComments}>Комментариев пока нет</p>
                      )}
                    </div>
                    <div className={styles.addCommentForm}>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Написать комментарий..."
                        className={styles.commentInput}
                        rows={2}
                      />
                      <button
                        onClick={() => handleAddComment(task.id)}
                        disabled={!newComment.trim()}
                        className={styles.addCommentButton}
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
