// Типы для системы уведомлений тендеров

export type TenderNotificationType =
  | 'deadline_approaching'
  | 'deadline_passed'
  | 'stage_changed'
  | 'assigned'
  | 'comment_added'
  | 'file_uploaded'
  | 'status_changed'
  | 'reminder'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';

export interface TenderNotification {
  id: string;
  company_id: string;
  user_id: string;
  tender_id: string | null;
  type: TenderNotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  priority: NotificationPriority;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationSettings {
  id: string;
  company_id: string;
  user_id: string;
  deadline_approaching_enabled: boolean;
  deadline_approaching_days: number;
  deadline_passed_enabled: boolean;
  stage_changed_enabled: boolean;
  assigned_enabled: boolean;
  comment_added_enabled: boolean;
  file_uploaded_enabled: boolean;
  status_changed_enabled: boolean;
  email_enabled: boolean;
  email_frequency: EmailFrequency;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationEmailLog {
  id: string;
  notification_id: string | null;
  user_id: string;
  email: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  company_id: string;
  user_id: string;
  tender_id?: string | null;
  type: TenderNotificationType;
  title: string;
  message: string;
  link?: string | null;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationSettingsInput {
  deadline_approaching_enabled?: boolean;
  deadline_approaching_days?: number;
  deadline_passed_enabled?: boolean;
  stage_changed_enabled?: boolean;
  assigned_enabled?: boolean;
  comment_added_enabled?: boolean;
  file_uploaded_enabled?: boolean;
  status_changed_enabled?: boolean;
  email_enabled?: boolean;
  email_frequency?: EmailFrequency;
  push_enabled?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<TenderNotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}
