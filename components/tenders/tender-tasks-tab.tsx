'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Pencil, Trash2, MessageSquare, Clock, User, Loader2, ListTodo } from 'lucide-react';

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
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500">Загрузка задач...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Задачи
          </h3>
          <div className="flex gap-2">
            <Badge variant="outline">{taskStats.total} всего</Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{taskStats.pending} ожидает</Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{taskStats.in_progress} в работе</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{taskStats.completed} завершено</Badge>
          </div>
        </div>
        <Button
          variant={showAddForm ? "outline" : "default"}
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingTask(null);
          }}
        >
          {showAddForm ? (
            <><X className="h-4 w-4 mr-2" />Отмена</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" />Добавить задачу</>
          )}
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>
          Все ({taskStats.total})
        </Button>
        <Button variant={filterStatus === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('pending')}>
          Ожидает ({taskStats.pending})
        </Button>
        <Button variant={filterStatus === 'in_progress' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('in_progress')}>
          В работе ({taskStats.in_progress})
        </Button>
        <Button variant={filterStatus === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('completed')}>
          Завершено ({taskStats.completed})
        </Button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h4 className="font-semibold">Новая задача</h4>
            <div className="space-y-2">
              <Label>Название задачи *</Label>
              <Input
                placeholder="Введите название задачи"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Добавьте описание задачи (необязательно)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v as 'low' | 'medium' | 'high' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Время выполнения</Label>
                <Input
                  type="time"
                  value={newTask.due_time}
                  onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddForm(false); setNewTask({ title: '', description: '', status: 'pending', priority: 'medium', due_time: '' }); }}>
                Отмена
              </Button>
              <Button onClick={handleAddTask} disabled={!newTask.title.trim() || isSubmitting}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Создание...</> : 'Создать задачу'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {filterStatus === 'all' ? 'Задач пока нет' : `Нет задач со статусом "${getStatusLabel(filterStatus as Task['status'])}"`}
          </h4>
          <p className="text-gray-500">
            {filterStatus === 'all' ? 'Добавьте первую задачу для этого тендера' : 'Попробуйте изменить фильтр'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            editingTask?.id === task.id ? (
              <Card key={task.id}>
                <CardContent className="p-4 space-y-4">
                  <h4 className="font-semibold">Редактирование задачи</h4>
                  <div className="space-y-2">
                    <Label>Название задачи *</Label>
                    <Input value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Textarea value={editingTask.description || ''} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Приоритет</Label>
                      <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as 'low' | 'medium' | 'high' })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Низкий</SelectItem>
                          <SelectItem value="medium">Средний</SelectItem>
                          <SelectItem value="high">Высокий</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Время выполнения</Label>
                      <Input type="time" value={editingTask.due_time || ''} onChange={(e) => setEditingTask({ ...editingTask, due_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditingTask(null)}>Отмена</Button>
                    <Button onClick={handleEditTask}>Сохранить</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <Badge variant="outline" className={task.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' : task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <Badge variant="outline" className={task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>
                      {task.description && <p className="text-gray-600 text-sm mb-3">{task.description}</p>}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDateTime(task.created_at)}</span>
                        {task.due_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Время: {task.due_time.slice(0,5)}</span>}
                        {task.assignee_name && <span className="flex items-center gap-1"><User className="h-4 w-4" />{task.assignee_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleComments(task.id)} title="Комментарии">
                        <MessageSquare className="h-4 w-4" />
                        {comments[task.id] && comments[task.id].length > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{comments[task.id].length}</span>}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingTask(task)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} title="Удалить"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      <Select value={task.status} onValueChange={(v) => handleUpdateStatus(task.id, v as Task['status'])}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ожидает</SelectItem>
                          <SelectItem value="in_progress">В работе</SelectItem>
                          <SelectItem value="completed">Завершена</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Секция комментариев */}
                  {selectedTaskForComments === task.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="font-medium mb-3">Комментарии</h5>
                      <div className="space-y-3 mb-4">
                        {loadingComments ? (
                          <p className="text-gray-500 text-sm">Загрузка...</p>
                        ) : comments[task.id] && comments[task.id].length > 0 ? (
                          comments[task.id].map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{comment.user_name || 'Пользователь'}</span>
                                  <span className="text-xs text-gray-500">{formatDateTime(comment.created_at)}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteComment(task.id, comment.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                              <p className="text-sm text-gray-700">{comment.comment}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">Комментариев пока нет</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Написать комментарий..." rows={2} className="flex-1" />
                        <Button onClick={() => handleAddComment(task.id)} disabled={!newComment.trim()}>Отправить</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}
    </div>
  );
}
