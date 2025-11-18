// Типы для системы задач и календаря

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type EventType =
  | 'deadline'
  | 'meeting'
  | 'presentation'
  | 'submission'
  | 'auction'
  | 'contract_signing'
  | 'payment'
  | 'delivery'
  | 'other';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMethod = 'notification' | 'email' | 'both';

export interface TenderTask {
  id: string;
  company_id: string;
  tender_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string;
  tags: string[];
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  company_id: string;
  tender_id: string | null;
  task_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence: RecurrenceType | null;
  recurrence_end: string | null;
  participants: string[];
  organizer: string | null;
  reminders: EventReminder[];
  color: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventReminder {
  minutes: number;
  sent: boolean;
}

export interface TaskReminder {
  id: string;
  task_id: string | null;
  event_id: string | null;
  user_id: string;
  remind_at: string;
  sent: boolean;
  sent_at: string | null;
  method: ReminderMethod;
  created_at: string;
}

export interface CreateTaskInput {
  company_id: string;
  tender_id?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
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
  start_date?: string | null;
  assigned_to?: string | null;
  tags?: string[];
  checklist?: ChecklistItem[];
}

export interface CreateEventInput {
  company_id: string;
  tender_id?: string | null;
  task_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  recurrence?: RecurrenceType;
  recurrence_end?: string | null;
  participants?: string[];
  reminders?: EventReminder[];
  color?: string | null;
  url?: string | null;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  today: number;
  this_week: number;
}
