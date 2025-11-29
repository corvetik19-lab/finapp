'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { 
  Task, 
  TasksData, 
  TaskStatus, 
  TaskPriority, 
  TaskAssignee, 
  TaskTender,
  ChecklistItem,
  CreateTaskInput
} from '@/lib/tenders/tasks-service';
import styles from './Tasks.module.css';

interface Props {
  initialData: TasksData;
  employees: TaskAssignee[];
  tenders: TaskTender[];
  companyId: string;
  userId: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Ожидает', color: '#f59e0b', icon: '⏳' },
  in_progress: { label: 'В работе', color: '#3b82f6', icon: '🔄' },
  completed: { label: 'Выполнено', color: '#10b981', icon: '✅' },
  cancelled: { label: 'Отменено', color: '#6b7280', icon: '❌' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  low: { label: 'Низкий', color: '#94a3b8', icon: '🔵' },
  normal: { label: 'Обычный', color: '#3b82f6', icon: '🟢' },
  high: { label: 'Высокий', color: '#f59e0b', icon: '🟡' },
  urgent: { label: 'Срочно', color: '#ef4444', icon: '🔴' },
};

type ViewMode = 'list' | 'board' | 'calendar';
type FilterStatus = TaskStatus | 'all' | 'active';

export default function TasksClient({ initialData, employees, tenders, companyId, userId }: Props) {
  const [data, setData] = useState<TasksData>(initialData);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedBoardCards, setExpandedBoardCards] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return data.tasks.filter(task => {
      // Status filter
      if (filterStatus === 'active') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
      } else if (filterStatus !== 'all') {
        if (task.status !== filterStatus) return false;
      }
      
      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      
      // Assignee filter
      if (filterAssignee !== 'all' && task.assigned_to !== filterAssignee) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.tender?.customer?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [data.tasks, filterStatus, filterPriority, filterAssignee, searchQuery]);

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    
    filteredTasks.forEach(task => {
      groups[task.status].push(task);
    });
    
    return groups;
  }, [filteredTasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < today;
  };

  const isDueToday = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateTime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
    if (timeStr) {
      return `${date} ${timeStr.substring(0, 5)}`;
    }
    return date;
  };

  const getChecklistProgress = (checklist: ChecklistItem[]) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(item => item.completed).length;
    return { completed, total: checklist.length, percent: Math.round((completed / checklist.length) * 100) };
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tenders/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      });
      
      if (response.ok) {
        setData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => 
            t.id === task.id 
              ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
              : t
          ),
        }));
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleChecklistItemToggle = async (task: Task, itemId: string) => {
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId 
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
        : item
    );

    try {
      const response = await fetch(`/api/tenders/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updatedChecklist }),
      });
      
      if (response.ok) {
        setData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => 
            t.id === task.id ? { ...t, checklist: updatedChecklist } : t
          ),
        }));
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskInput) => {
    try {
      const response = await fetch('/api/tenders/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, company_id: companyId, created_by: userId }),
      });
      
      if (response.ok) {
        const newTask = await response.json();
        setData(prev => ({
          ...prev,
          tasks: [newTask.data, ...prev.tasks],
        }));
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Удалить задачу?')) return;
    
    try {
      const response = await fetch(`/api/tenders/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setData(prev => ({
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId),
        }));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    // Add dragging class
    (e.target as HTMLDivElement).classList.add(styles.dragging);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTask(null);
    setDragOverColumn(null);
    (e.target as HTMLDivElement).classList.remove(styles.dragging);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === draggedTask.id 
          ? { ...t, status: targetStatus, completed_at: targetStatus === 'completed' ? new Date().toISOString() : null }
          : t
      ),
    }));

    try {
      await fetch(`/api/tenders/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: targetStatus,
          completed_at: targetStatus === 'completed' ? new Date().toISOString() : null,
        }),
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert on error
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === draggedTask.id ? { ...t, status: draggedTask.status } : t
        ),
      }));
    }

    setDraggedTask(null);
  };

  const toggleBoardCardExpanded = (taskId: string) => {
    setExpandedBoardCards(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const { stats } = data;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>✅</span>
            Задачи
          </h1>
          <p className={styles.subtitle}>Управление задачами по тендерам</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewModeButtons}>
            {(['list', 'board'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`${styles.viewModeBtn} ${viewMode === mode ? styles.viewModeBtnActive : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'list' ? '📋 Список' : '📊 Доска'}
              </button>
            ))}
          </div>
          <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
            <span>+</span> Создать задачу
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Всего</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Ожидают</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>🔄</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.inProgress}</div>
            <div className={styles.statLabel}>В работе</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Выполнено</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.overdue}</div>
            <div className={styles.statLabel}>Просрочено</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statUrgent}`}>
          <div className={styles.statIcon}>🔴</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.highPriority}</div>
            <div className={styles.statLabel}>Срочные</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Поиск задач..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className={styles.filterSelect}
          >
            <option value="active">Активные</option>
            <option value="all">Все статусы</option>
            <option value="pending">Ожидают</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнено</option>
            <option value="cancelled">Отменено</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
            className={styles.filterSelect}
          >
            <option value="all">Все приоритеты</option>
            <option value="urgent">🔴 Срочно</option>
            <option value="high">🟡 Высокий</option>
            <option value="normal">🟢 Обычный</option>
            <option value="low">🔵 Низкий</option>
          </select>

          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Все исполнители</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className={styles.taskList}>
          {filteredTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📝</span>
              <h3>Нет задач</h3>
              <p>Создайте первую задачу для начала работы</p>
              <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                + Создать задачу
              </button>
            </div>
          ) : (
            filteredTasks.map(task => {
              const overdue = isOverdue(task);
              const dueToday = isDueToday(task);
              const isExpanded = expandedTasks.has(task.id);
              const checklistProgress = getChecklistProgress(task.checklist);

              return (
                <div
                  key={task.id}
                  className={`${styles.taskCard} ${overdue ? styles.taskOverdue : ''} ${dueToday ? styles.taskDueToday : ''}`}
                >
                  <div className={styles.taskMain}>
                    {/* Checkbox */}
                    <button
                      className={`${styles.taskCheckbox} ${task.status === 'completed' ? styles.taskCheckboxChecked : ''}`}
                      onClick={() => handleStatusChange(task, task.status === 'completed' ? 'pending' : 'completed')}
                    >
                      {task.status === 'completed' && '✓'}
                    </button>

                    {/* Content */}
                    <div className={styles.taskContent}>
                      <div className={styles.taskHeader}>
                        <h3 className={`${styles.taskTitle} ${task.status === 'completed' ? styles.taskTitleCompleted : ''}`}>
                          {task.title}
                        </h3>
                        <div className={styles.taskBadges}>
                          {overdue && <span className={styles.badgeOverdue}>Просрочено</span>}
                          {dueToday && !overdue && <span className={styles.badgeToday}>Сегодня</span>}
                          <span 
                            className={styles.badgePriority}
                            style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
                          >
                            {PRIORITY_CONFIG[task.priority].icon} {PRIORITY_CONFIG[task.priority].label}
                          </span>
                          <span 
                            className={styles.badgeStatus}
                            style={{ backgroundColor: STATUS_CONFIG[task.status].color }}
                          >
                            {STATUS_CONFIG[task.status].label}
                          </span>
                        </div>
                      </div>

                      {task.description && (
                        <p className={styles.taskDescription}>{task.description}</p>
                      )}

                      {/* Checklist progress */}
                      {checklistProgress && (
                        <div className={styles.checklistProgress}>
                          <div className={styles.checklistBar}>
                            <div 
                              className={styles.checklistBarFill}
                              style={{ width: `${checklistProgress.percent}%` }}
                            />
                          </div>
                          <span className={styles.checklistText}>
                            {checklistProgress.completed}/{checklistProgress.total} подзадач
                          </span>
                        </div>
                      )}

                      <div className={styles.taskMeta}>
                        {task.due_date && (
                          <span className={`${styles.taskMetaItem} ${overdue ? styles.taskMetaOverdue : ''}`}>
                            📅 {formatDateTime(task.due_date, task.due_time)}
                          </span>
                        )}
                        {task.assignee && (
                          <span className={styles.taskMetaItem}>
                            👤 {task.assignee.full_name}
                          </span>
                        )}
                        {task.tender && (
                          <Link href={`/tenders/${task.tender.id}`} className={styles.taskTenderLink}>
                            📑 {task.tender.customer?.substring(0, 30)}...
                          </Link>
                        )}
                        {task.tags && task.tags.length > 0 && (
                          <div className={styles.taskTags}>
                            {task.tags.map(tag => (
                              <span key={tag} className={styles.taskTag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.taskActions}>
                      {task.checklist.length > 0 && (
                        <button
                          className={styles.taskActionBtn}
                          onClick={() => toggleTaskExpanded(task.id)}
                          title="Показать подзадачи"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                      <button
                        className={styles.taskActionBtn}
                        onClick={() => setEditingTask(task)}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${styles.taskActionBtn} ${styles.taskActionBtnDanger}`}
                        onClick={() => handleDeleteTask(task.id)}
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Expanded Checklist */}
                  {isExpanded && task.checklist.length > 0 && (
                    <div className={styles.taskChecklist}>
                      {task.checklist.map(item => (
                        <div key={item.id} className={styles.checklistItem}>
                          <button
                            className={`${styles.checklistCheckbox} ${item.completed ? styles.checklistCheckboxChecked : ''}`}
                            onClick={() => handleChecklistItemToggle(task, item.id)}
                          >
                            {item.completed && '✓'}
                          </button>
                          <span className={`${styles.checklistText} ${item.completed ? styles.checklistTextCompleted : ''}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className={styles.boardView}>
          {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map(status => (
            <div 
              key={status} 
              className={`${styles.boardColumn} ${dragOverColumn === status ? styles.boardColumnDragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div 
                className={styles.boardColumnHeader}
                style={{ borderTopColor: STATUS_CONFIG[status].color }}
              >
                <span>{STATUS_CONFIG[status].icon}</span>
                <h3>{STATUS_CONFIG[status].label}</h3>
                <span className={styles.boardColumnCount}>{tasksByStatus[status].length}</span>
              </div>
              <div className={styles.boardColumnBody}>
                {tasksByStatus[status].map(task => {
                  const overdue = isOverdue(task);
                  const checklistProgress = getChecklistProgress(task.checklist);
                  const isCardExpanded = expandedBoardCards.has(task.id);
                  const hasChecklist = task.checklist && task.checklist.length > 0;

                  return (
                    <div
                      key={task.id}
                      className={`${styles.boardCard} ${overdue ? styles.boardCardOverdue : ''} ${draggedTask?.id === task.id ? styles.boardCardDragging : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={styles.boardCardHeader}>
                        <span 
                          className={styles.boardCardPriority}
                          style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
                        />
                        <h4 className={styles.boardCardTitle}>{task.title}</h4>
                        <span className={styles.boardCardDragHandle}>⋮⋮</span>
                      </div>
                      
                      {task.description && !isCardExpanded && (
                        <p className={styles.boardCardDescription}>
                          {task.description.substring(0, 60)}...
                        </p>
                      )}

                      {/* Checklist progress bar - clickable to expand */}
                      {hasChecklist && (
                        <div 
                          className={styles.boardCardProgress}
                          onClick={() => toggleBoardCardExpanded(task.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={styles.checklistBar}>
                            <div 
                              className={styles.checklistBarFill}
                              style={{ width: `${checklistProgress?.percent || 0}%` }}
                            />
                          </div>
                          <span>{checklistProgress?.completed}/{checklistProgress?.total}</span>
                          <span className={styles.expandIcon}>{isCardExpanded ? '▲' : '▼'}</span>
                        </div>
                      )}

                      {/* Expanded checklist items */}
                      {isCardExpanded && hasChecklist && (
                        <div className={styles.boardCardChecklist}>
                          {task.checklist.map(item => (
                            <div 
                              key={item.id} 
                              className={styles.boardChecklistItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChecklistItemToggle(task, item.id);
                              }}
                            >
                              <span 
                                className={`${styles.boardChecklistCheckbox} ${item.completed ? styles.boardChecklistChecked : ''}`}
                              >
                                {item.completed ? '✓' : ''}
                              </span>
                              <span className={`${styles.boardChecklistText} ${item.completed ? styles.boardChecklistTextDone : ''}`}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles.boardCardFooter}>
                        {task.due_date && (
                          <span className={overdue ? styles.boardCardOverdueText : ''}>
                            📅 {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.assignee && (
                          <span className={styles.boardCardAssignee}>
                            {task.assignee.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTask) && (
        <TaskModal
          task={editingTask}
          employees={employees}
          tenders={tenders}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
          onSave={async (taskData) => {
            if (editingTask) {
              // Update
              try {
                const response = await fetch(`/api/tenders/tasks/${editingTask.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(taskData),
                });
                if (response.ok) {
                  const updated = await response.json();
                  setData(prev => ({
                    ...prev,
                    tasks: prev.tasks.map(t => t.id === editingTask.id ? { ...t, ...updated.data } : t),
                  }));
                  setEditingTask(null);
                }
              } catch (error) {
                console.error('Error updating task:', error);
              }
            } else {
              await handleCreateTask({ ...taskData, company_id: companyId } as CreateTaskInput);
            }
          }}
        />
      )}
    </div>
  );
}

// Task Modal Component
function TaskModal({
  task,
  employees,
  tenders,
  onClose,
  onSave,
}: {
  task: Task | null;
  employees: TaskAssignee[];
  tenders: TaskTender[];
  onClose: () => void;
  onSave: (data: Partial<CreateTaskInput>) => void;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'pending');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'normal');
  const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '');
  const [dueTime, setDueTime] = useState(task?.due_time?.substring(0, 5) || '');
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || '');
  const [tenderId, setTenderId] = useState(task?.tender_id || '');
  const [tags, setTags] = useState(task?.tags?.join(', ') || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false },
    ]);
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      due_time: dueTime || null,
      assigned_to: assignedTo || null,
      tender_id: tenderId || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      checklist,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button onClick={onClose} className={styles.modalClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Название *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Введите название задачи"
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Подробное описание задачи"
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Срок выполнения</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Время</label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Исполнитель</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">Не назначен</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Тендер</label>
              <select value={tenderId} onChange={e => setTenderId(e.target.value)}>
                <option value="">Без тендера</option>
                {tenders.map(t => (
                  <option key={t.id} value={t.id}>{t.customer?.substring(0, 40)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Теги (через запятую)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="документы, срочно, ожидание"
            />
          </div>

          {/* Checklist */}
          <div className={styles.formGroup}>
            <label>Подзадачи</label>
            <div className={styles.checklistEditor}>
              {checklist.map(item => (
                <div key={item.id} className={styles.checklistEditorItem}>
                  <span>{item.text}</span>
                  <button type="button" onClick={() => handleRemoveChecklistItem(item.id)}>✕</button>
                </div>
              ))}
              <div className={styles.checklistEditorAdd}>
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  placeholder="Добавить подзадачу..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                />
                <button type="button" onClick={handleAddChecklistItem}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary}>
              {task ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
