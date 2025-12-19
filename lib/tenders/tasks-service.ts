import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';
import { logger } from "@/lib/logger";

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

export interface TaskAssignee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TaskTender {
  id: string;
  purchase_number: string;
  customer: string;
  subject: string;
}

export interface Task {
  id: string;
  company_id: string;
  tender_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  start_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string;
  tags: string[];
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: TaskAssignee | null;
  creator?: TaskAssignee | null;
  tender?: TaskTender | null;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  highPriority: number;
}

export interface TasksData {
  tasks: Task[];
  stats: TaskStats;
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assignedTo?: string | 'all';
  tenderId?: string;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface CreateTaskInput {
  company_id: string;
  tender_id?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  assigned_to?: string | null;
  tags?: string[];
  checklist?: ChecklistItem[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  assigned_to?: string | null;
  tags?: string[];
  checklist?: ChecklistItem[];
}

export async function getTasksData(companyId: string, filters?: TaskFilters): Promise<TasksData> {
  const supabase = await createRSCClient();

  // Проверяем права пользователя
  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = canViewAllTenders(userPermissions);

  let query = supabase
    .from('tender_tasks')
    .select(`
      id,
      company_id,
      tender_id,
      title,
      description,
      status,
      priority,
      due_date,
      due_time,
      start_date,
      completed_at,
      assigned_to,
      created_by,
      tags,
      checklist,
      created_at,
      updated_at
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  // Фильтрация по правам пользователя - сотрудники видят только свои задачи
  if (!canViewAll && userPermissions.employeeId) {
    query = query.eq('assigned_to', userPermissions.employeeId);
  }

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.assignedTo && filters.assignedTo !== 'all') {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.tenderId) {
    query = query.eq('tender_id', filters.tenderId);
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching tasks:', error);
    return { tasks: [], stats: getEmptyStats() };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const tasks: Task[] = (data || []).map(task => ({
    ...task,
    checklist: task.checklist || [],
    tags: task.tags || [],
    assignee: null,
    creator: null,
    tender: null,
  }));

  // Calculate stats
  const stats: TaskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.due_date) < today;
    }).length,
    dueToday: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length,
    dueTomorrow: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === tomorrow.getTime();
    }).length,
    highPriority: tasks.filter(t => 
      (t.priority === 'high' || t.priority === 'urgent') && 
      t.status !== 'completed' && t.status !== 'cancelled'
    ).length,
  };

  return { tasks, stats };
}

function getEmptyStats(): TaskStats {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
    highPriority: 0,
  };
}

export async function getEmployees(companyId: string): Promise<TaskAssignee[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (error) {
    logger.error('Error fetching employees:', error);
    return [];
  }

  // Получаем профили отдельно
  const userIds = (data || []).map(m => m.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    logger.error('Error fetching profiles:', profilesError);
    return [];
  }

  return (profiles || []).map(p => ({
    id: p.id,
    full_name: p.full_name || 'Без имени',
    avatar_url: p.avatar_url,
  }));
}

export async function getTendersForTasks(companyId: string): Promise<TaskTender[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from('tenders')
    .select('id, purchase_number, customer, subject')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('status', ['active', 'won'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error('Error fetching tenders:', error);
    return [];
  }

  return data || [];
}
