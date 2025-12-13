// =====================================================
// ТИПЫ ДЛЯ БЛОКА "КОМАНДНАЯ РАБОТА"
// =====================================================

// =====================================================
// ЧАТ
// =====================================================

export type ChatRoomType = 'tender' | 'team' | 'private' | 'general' | 'department';

export interface ChatRoom {
  id: string;
  company_id: string;
  tender_id: string | null;
  department: string | null;
  name: string;
  description: string | null;
  type: ChatRoomType;
  avatar_url: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  participants_count?: number;
  unread_count?: number;
  last_message?: ChatMessage | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  attachments: ChatAttachment[];
  reply_to: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reply_message?: ChatMessage | null;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  is_muted: boolean;
  joined_at: string;
  last_read_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// =====================================================
// ВИДЕОКОНФЕРЕНЦИИ
// =====================================================

export type ConferenceStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface Conference {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  host_id: string;
  jitsi_room_name: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: ConferenceStatus;
  recording_url: string | null;
  tender_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  host?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  participants?: ConferenceParticipant[];
  participants_count?: number;
}

export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'joined' | 'left';

export interface ConferenceParticipant {
  id: string;
  conference_id: string;
  user_id: string;
  status: ParticipantStatus;
  invited_at: string;
  joined_at: string | null;
  left_at: string | null;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// =====================================================
// КАНБАН-ДОСКИ
// =====================================================

export interface KanbanBoard {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  background_color: string;
  is_template: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  columns?: KanbanColumn[];
  members?: KanbanBoardMember[];
  members_count?: number;
  cards_count?: number;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  wip_limit: number | null;
  is_done_column: boolean;
  created_at: string;
  // Joined
  cards?: KanbanCard[];
  cards_count?: number;
}

export type CardPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: CardPriority;
  assignee_ids: string[];
  due_date: string | null;
  due_time: string | null;
  labels: string[];
  attachments: CardAttachment[];
  checklist: ChecklistItem[];
  tender_id: string | null;
  task_id: string | null;
  position: number;
  estimated_hours: number | null;
  spent_hours: number;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  assignees?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
  tender?: {
    id: string;
    customer: string;
  } | null;
  comments_count?: number;
}

export interface CardAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type BoardMemberRole = 'owner' | 'editor' | 'viewer';

export interface KanbanBoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardMemberRole;
  invited_by: string | null;
  invited_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

export interface KanbanCardComment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// =====================================================
// СПРИНТЫ
// =====================================================

export type SprintStatus = 'planning' | 'active' | 'review' | 'completed' | 'cancelled';

export interface Sprint {
  id: string;
  company_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  velocity: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  items?: SprintItem[];
  items_count?: number;
  completed_items_count?: number;
  total_story_points?: number;
  completed_story_points?: number;
}

export type SprintItemType = 'task' | 'tender' | 'card';
export type SprintItemStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface SprintItem {
  id: string;
  sprint_id: string;
  item_type: SprintItemType;
  item_id: string;
  story_points: number | null;
  priority: number;
  status: SprintItemStatus;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined
  item_title?: string;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface SprintRetrospective {
  id: string;
  sprint_id: string;
  what_went_well: string[];
  what_to_improve: string[];
  action_items: ActionItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assigned_to: string | null;
  completed: boolean;
}

// =====================================================
// ЗАГРУЗКА СОТРУДНИКОВ
// =====================================================

export type AllocationStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface WorkloadAllocation {
  id: string;
  company_id: string;
  user_id: string;
  tender_id: string | null;
  task_id: string | null;
  title: string;
  description: string | null;
  allocated_hours: number;
  start_date: string;
  end_date: string;
  priority: CardPriority;
  status: AllocationStatus;
  progress_percent: number;
  notes: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  tender?: {
    id: string;
    customer: string;
  } | null;
}

export interface CapacitySettings {
  id: string;
  company_id: string;
  user_id: string;
  weekly_hours: number;
  daily_hours: number;
  work_days: number[];
  vacation_days: VacationDay[];
  sick_days: SickDay[];
  updated_at: string;
}

export interface VacationDay {
  start_date: string;
  end_date: string;
  type: 'vacation' | 'holiday';
  description?: string;
}

export interface SickDay {
  date: string;
  description?: string;
}

// =====================================================
// РЕЙТИНГ И АНАЛИТИКА
// =====================================================

export type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export interface PerformanceMetrics {
  id: string;
  company_id: string;
  user_id: string;
  period_type: PeriodType;
  period_start: string;
  tenders_won: number;
  tenders_total: number;
  tasks_completed: number;
  tasks_total: number;
  avg_completion_days: number | null;
  quality_score: number | null;
  on_time_percentage: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface PeerReview {
  id: string;
  company_id: string;
  reviewer_id: string;
  reviewee_id: string;
  sprint_id: string | null;
  rating: number;
  feedback: string | null;
  skills: SkillRating[];
  is_anonymous: boolean;
  created_at: string;
  // Joined
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reviewee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface SkillRating {
  skill: string;
  rating: number;
}

// =====================================================
// КАЛЕНДАРЬ ЗАНЯТОСТИ
// =====================================================

export type CalendarEventType = 'meeting' | 'deadline' | 'vacation' | 'sick' | 'conference' | 'task' | 'other';

export interface TeamCalendarEvent {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  conference_id: string | null;
  tender_id: string | null;
  recurrence_rule: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  attendees?: CalendarAttendee[];
  attendees_count?: number;
  conference?: Conference | null;
}

export type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface CalendarAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  is_required: boolean;
  notified_at: string | null;
  responded_at: string | null;
  // Joined
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateChatRoomInput {
  name: string;
  description?: string;
  type: ChatRoomType;
  tender_id?: string;
  participant_ids?: string[];
}

export interface CreateConferenceInput {
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  tender_id?: string;
  participant_ids?: string[];
}

export interface CreateKanbanBoardInput {
  name: string;
  description?: string;
  background_color?: string;
  is_template?: boolean;
  columns?: { name: string; color?: string }[];
  member_ids?: string[];
}

export interface CreateKanbanCardInput {
  column_id: string;
  title: string;
  description?: string;
  priority?: CardPriority;
  assignee_ids?: string[];
  due_date?: string;
  labels?: string[];
  tender_id?: string;
  estimated_hours?: number;
}

export interface CreateSprintInput {
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
}

export interface CreateWorkloadInput {
  user_id: string;
  title: string;
  description?: string;
  allocated_hours: number;
  start_date: string;
  end_date: string;
  priority?: CardPriority;
  tender_id?: string;
  task_id?: string;
  color?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  location?: string;
  conference_id?: string;
  tender_id?: string;
  color?: string;
  attendee_ids?: string[];
}
