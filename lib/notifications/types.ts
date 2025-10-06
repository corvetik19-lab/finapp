export type NotificationType = "success" | "error" | "warning" | "info";

export type NotificationPriority = "low" | "normal" | "high";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
};

export type NotificationInput = Omit<Notification, "id" | "timestamp" | "read"> & {
  id?: string;
  timestamp?: Date;
  read?: boolean;
};
