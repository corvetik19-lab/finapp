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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, List, LayoutGrid, ChevronDown, ChevronUp, Trash2, ExternalLink, Pencil } from 'lucide-react';

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
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">✅ Задачи</h1>
          <p className="text-gray-500 mt-1">Управление задачами по тендерам</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['list', 'board'] as ViewMode[]).map(mode => (
              <Button key={mode} variant={viewMode === mode ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode(mode)}>
                {mode === 'list' ? <><List className="h-4 w-4 mr-1" />Список</> : <><LayoutGrid className="h-4 w-4 mr-1" />Доска</>}
              </Button>
            ))}
          </div>
          <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-1" />Создать задачу</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">📋</span><div><div className="text-xl font-bold">{stats.total}</div><div className="text-xs text-gray-500">Всего</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-400"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">⏳</span><div><div className="text-xl font-bold text-amber-600">{stats.pending}</div><div className="text-xs text-gray-500">Ожидают</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-blue-400"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">🔄</span><div><div className="text-xl font-bold text-blue-600">{stats.inProgress}</div><div className="text-xs text-gray-500">В работе</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-400"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">✅</span><div><div className="text-xl font-bold text-green-600">{stats.completed}</div><div className="text-xs text-gray-500">Выполнено</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-red-400"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">🔥</span><div><div className="text-xl font-bold text-red-600">{stats.overdue}</div><div className="text-xs text-gray-500">Просрочено</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-red-600"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">🔴</span><div><div className="text-xl font-bold text-red-700">{stats.highPriority}</div><div className="text-xs text-gray-500">Срочные</div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input type="text" placeholder="Поиск задач..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
            <option value="active">Активные</option>
            <option value="all">Все статусы</option>
            <option value="pending">Ожидают</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнено</option>
            <option value="cancelled">Отменено</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">Все приоритеты</option>
            <option value="urgent">🔴 Срочно</option>
            <option value="high">🟡 Высокий</option>
            <option value="normal">🟢 Обычный</option>
            <option value="low">🔵 Низкий</option>
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">Все исполнители</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <span className="text-5xl">📝</span>
                <h3 className="text-lg font-semibold mt-4">Нет задач</h3>
                <p className="text-gray-500 mt-1">Создайте первую задачу для начала работы</p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-1" />Создать задачу</Button>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map(task => {
              const overdue = isOverdue(task);
              const dueToday = isDueToday(task);
              const isExpanded = expandedTasks.has(task.id);
              const checklistProgress = getChecklistProgress(task.checklist);
              return (
                <Card key={task.id} className={`${overdue ? 'border-l-4 border-l-red-500 bg-red-50/50' : dueToday ? 'border-l-4 border-l-amber-500 bg-amber-50/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`} onClick={() => handleStatusChange(task, task.status === 'completed' ? 'pending' : 'completed')}>
                        {task.status === 'completed' && '✓'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</h3>
                          <div className="flex items-center gap-1 flex-wrap">
                            {overdue && <Badge variant="destructive" className="text-xs">Просрочено</Badge>}
                            {dueToday && !overdue && <Badge className="text-xs bg-amber-500">Сегодня</Badge>}
                            <Badge className="text-xs text-white" style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}>{PRIORITY_CONFIG[task.priority].icon} {PRIORITY_CONFIG[task.priority].label}</Badge>
                            <Badge className="text-xs text-white" style={{ backgroundColor: STATUS_CONFIG[task.status].color }}>{STATUS_CONFIG[task.status].label}</Badge>
                          </div>
                        </div>
                        {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                        {checklistProgress && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${checklistProgress.percent}%` }} /></div>
                            <span className="text-xs text-gray-500">{checklistProgress.completed}/{checklistProgress.total}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                          {task.due_date && <span className={overdue ? 'text-red-600 font-medium' : ''}>📅 {formatDateTime(task.due_date, task.due_time)}</span>}
                          {task.assignee && <span>👤 {task.assignee.full_name}</span>}
                          {task.tender && <Link href={`/tenders/${task.tender.id}`} className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />{task.tender.customer?.substring(0, 30)}...</Link>}
                          {task.tags?.map(tag => <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded">#{tag}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {task.checklist.length > 0 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTaskExpanded(task.id)}>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTask(task)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {isExpanded && task.checklist.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {task.checklist.map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            <button className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`} onClick={() => handleChecklistItemToggle(task, item.id)}>
                              {item.completed && '✓'}
                            </button>
                            <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : ''}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map(status => (
            <div 
              key={status} 
              className={`bg-gray-50 rounded-lg min-h-[400px] ${dragOverColumn === status ? 'ring-2 ring-blue-400' : ''}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="p-3 border-t-4 rounded-t-lg flex items-center gap-2" style={{ borderTopColor: STATUS_CONFIG[status].color }}>
                <span>{STATUS_CONFIG[status].icon}</span>
                <h3 className="font-medium flex-1">{STATUS_CONFIG[status].label}</h3>
                <Badge variant="secondary">{tasksByStatus[status].length}</Badge>
              </div>
              <div className="p-2 space-y-2">
                {tasksByStatus[status].map(task => {
                  const overdue = isOverdue(task);
                  const checklistProgress = getChecklistProgress(task.checklist);
                  const isCardExpanded = expandedBoardCards.has(task.id);
                  const hasChecklist = task.checklist && task.checklist.length > 0;
                  return (
                    <Card
                      key={task.id}
                      className={`cursor-grab ${overdue ? 'border-l-4 border-l-red-500' : ''} ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }} />
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <span className="text-gray-400 cursor-grab">⋮⋮</span>
                        </div>
                        {task.description && !isCardExpanded && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description.substring(0, 60)}...</p>}
                        {hasChecklist && (
                          <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => toggleBoardCardExpanded(task.id)}>
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${checklistProgress?.percent || 0}%` }} /></div>
                            <span className="text-xs text-gray-500">{checklistProgress?.completed}/{checklistProgress?.total}</span>
                            {isCardExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </div>
                        )}
                        {isCardExpanded && hasChecklist && (
                          <div className="mt-2 space-y-1">
                            {task.checklist.map(item => (
                              <div key={item.id} className="flex items-center gap-2 text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); handleChecklistItemToggle(task, item.id); }}>
                                <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>{item.completed ? '✓' : ''}</span>
                                <span className={item.completed ? 'line-through text-gray-400' : ''}>{item.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          {task.due_date && <span className={overdue ? 'text-red-600' : ''}>📅 {formatDate(task.due_date)}</span>}
                          {task.assignee && <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">{task.assignee.full_name.split(' ').map(n => n[0]).join('')}</span>}
                        </div>
                      </CardContent>
                    </Card>
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
    setChecklist([...checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }]);
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Введите название задачи" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Подробное описание задачи" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Статус</Label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.icon} {cfg.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.icon} {cfg.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Срок выполнения</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Время</Label>
              <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Не назначен</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Тендер</Label>
              <select value={tenderId} onChange={e => setTenderId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Без тендера</option>
                {tenders.map(t => <option key={t.id} value={t.id}>{t.customer?.substring(0, 40)}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Теги (через запятую)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="документы, срочно, ожидание" />
          </div>
          <div className="space-y-2">
            <Label>Подзадачи</Label>
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <span className="text-sm">{item.text}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleRemoveChecklistItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="Добавить подзадачу..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} />
                <Button type="button" variant="outline" size="icon" onClick={handleAddChecklistItem}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit">{task ? 'Сохранить' : 'Создать'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
