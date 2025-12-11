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
import { 
  Plus, 
  Search, 
  List, 
  LayoutGrid, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ExternalLink, 
  Pencil,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Flame,
  ListTodo,
  Calendar,
  User,
  GripVertical,
  Check,
  XCircle,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initialData: TasksData;
  employees: TaskAssignee[];
  tenders: TaskTender[];
  companyId: string;
  userId: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending: { label: 'Ожидает', variant: 'secondary', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  in_progress: { label: 'В работе', variant: 'secondary', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  completed: { label: 'Выполнено', variant: 'secondary', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  cancelled: { label: 'Отменено', variant: 'secondary', className: 'bg-gray-100 text-gray-500 hover:bg-gray-100' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  low: { label: 'Низкий', variant: 'outline', className: 'border-slate-300 text-slate-500' },
  normal: { label: 'Обычный', variant: 'outline', className: 'border-blue-300 text-blue-600' },
  high: { label: 'Высокий', variant: 'outline', className: 'border-amber-400 text-amber-600' },
  urgent: { label: 'Срочно', variant: 'destructive', className: '' },
};

const StatusIcon = ({ status }: { status: TaskStatus }) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
    case 'in_progress': return <Circle className="h-4 w-4 text-blue-500" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-gray-400" />;
  }
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
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-primary" />
            Задачи
          </h1>
          <p className="text-muted-foreground mt-1">Управление задачами по тендерам</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg p-1">
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('list')}
              className="gap-1.5"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Список</span>
            </Button>
            <Button 
              variant={viewMode === 'board' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('board')}
              className="gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Доска</span>
            </Button>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Создать задачу</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Всего задач</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{stats.pending}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ожидают</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Circle className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{stats.inProgress}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">В работе</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Выполнено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{stats.overdue}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Просрочено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{stats.highPriority}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Срочные</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Поиск задач..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9" 
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">Ожидают</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="completed">Выполнено</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as TaskPriority | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все приоритеты</SelectItem>
                  <SelectItem value="urgent">Срочно</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="normal">Обычный</SelectItem>
                  <SelectItem value="low">Низкий</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Исполнитель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все исполнители</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ListTodo className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Нет задач</h3>
                <p className="text-muted-foreground mt-1 mb-4">Создайте первую задачу для начала работы</p>
                <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Создать задачу
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map(task => {
              const overdue = isOverdue(task);
              const dueToday = isDueToday(task);
              const isExpanded = expandedTasks.has(task.id);
              const checklistProgress = getChecklistProgress(task.checklist);
              return (
                <Card key={task.id} className={`transition-colors ${overdue ? 'border-destructive/50 bg-destructive/5' : dueToday ? 'border-amber-200 bg-amber-50/30' : 'hover:bg-muted/50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${task.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary'}`} 
                        onClick={() => handleStatusChange(task, task.status === 'completed' ? 'pending' : 'completed')}
                      >
                        {task.status === 'completed' && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {overdue && <Badge variant="destructive" className="text-xs">Просрочено</Badge>}
                            {dueToday && !overdue && <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">Сегодня</Badge>}
                            <Badge variant={PRIORITY_CONFIG[task.priority].variant} className={`text-xs ${PRIORITY_CONFIG[task.priority].className}`}>
                              {PRIORITY_CONFIG[task.priority].label}
                            </Badge>
                            <Badge variant="secondary" className={`text-xs ${STATUS_CONFIG[task.status].className}`}>
                              {STATUS_CONFIG[task.status].label}
                            </Badge>
                          </div>
                        </div>
                        {task.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>}
                        {checklistProgress && (
                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${checklistProgress.percent}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{checklistProgress.completed}/{checklistProgress.total}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDateTime(task.due_date, task.due_time)}
                            </span>
                          )}
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {task.assignee.full_name}
                            </span>
                          )}
                          {task.tender && (
                            <Link href={`/tenders/${task.tender.id}`} className="text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {task.tender.customer?.substring(0, 30)}...
                            </Link>
                          )}
                          {task.tags?.map(tag => (
                            <span key={tag} className="bg-muted px-2 py-0.5 rounded-md">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {task.checklist.length > 0 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTaskExpanded(task.id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTask(task)} title="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)} title="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && task.checklist.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        {task.checklist.map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            <button 
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary'}`} 
                              onClick={() => handleChecklistItemToggle(task, item.id)}
                            >
                              {item.completed && <Check className="h-2.5 w-2.5" />}
                            </button>
                            <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>
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
            <Card 
              key={status} 
              className={`min-h-[400px] transition-all ${dragOverColumn === status ? 'ring-2 ring-primary' : ''}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="p-3 border-b flex items-center gap-2">
                <StatusIcon status={status} />
                <h3 className="font-medium flex-1">{STATUS_CONFIG[status].label}</h3>
                <Badge variant="secondary" className="rounded-full">{tasksByStatus[status].length}</Badge>
              </div>
              <CardContent className="p-2 space-y-2">
                {tasksByStatus[status].map(task => {
                  const overdue = isOverdue(task);
                  const checklistProgress = getChecklistProgress(task.checklist);
                  const isCardExpanded = expandedBoardCards.has(task.id);
                  const hasChecklist = task.checklist && task.checklist.length > 0;
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border bg-card cursor-grab transition-all hover:shadow-sm ${overdue ? 'border-destructive/50 bg-destructive/5' : ''} ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant={PRIORITY_CONFIG[task.priority].variant} className={`text-[10px] px-1.5 py-0 h-5 ${PRIORITY_CONFIG[task.priority].className}`}>
                          {PRIORITY_CONFIG[task.priority].label}
                        </Badge>
                        <h4 className="font-medium text-sm flex-1 line-clamp-2">{task.title}</h4>
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                      </div>
                      {task.description && !isCardExpanded && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
                      )}
                      {hasChecklist && (
                        <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => toggleBoardCardExpanded(task.id)}>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${checklistProgress?.percent || 0}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{checklistProgress?.completed}/{checklistProgress?.total}</span>
                          {isCardExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      )}
                      {isCardExpanded && hasChecklist && (
                        <div className="mt-2 space-y-1">
                          {task.checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-2 text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); handleChecklistItemToggle(task, item.id); }}>
                              <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                                {item.completed && <Check className="h-2.5 w-2.5" />}
                              </span>
                              <span className={item.completed ? 'line-through text-muted-foreground' : ''}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        {task.due_date ? (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </span>
                        ) : <span />}
                        {task.assignee && (
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                            {task.assignee.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
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
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="completed">Выполнено</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="normal">Обычный</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочно</SelectItem>
                </SelectContent>
              </Select>
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
              <Select value={assignedTo || "_none"} onValueChange={(value) => setAssignedTo(value === "_none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Не назначен</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тендер</Label>
              <Select value={tenderId || "_none"} onValueChange={(value) => setTenderId(value === "_none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Без тендера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Без тендера</SelectItem>
                  {tenders.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.customer?.substring(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Теги (через запятую)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="документы, срочно, ожидание" />
          </div>
          <div className="space-y-2">
            <Label>Подзадачи</Label>
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              {checklist.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Нет подзадач</p>
              )}
              {checklist.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-background p-2.5 rounded-md border">
                  <span className="text-sm">{item.text}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={() => handleRemoveChecklistItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Input 
                  value={newChecklistItem} 
                  onChange={e => setNewChecklistItem(e.target.value)} 
                  placeholder="Добавить подзадачу..." 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())} 
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
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
