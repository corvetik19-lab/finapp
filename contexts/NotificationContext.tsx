"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import type { Notification, NotificationInput } from "@/lib/notifications/types";

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: NotificationInput) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "finapp_notifications";
const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Загрузка из localStorage при монтировании
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Omit<Notification, "timestamp"> & { timestamp: string }>;
        // Преобразуем строки дат обратно в Date объекты
        const withDates = parsed.map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(withDates);
      }
    } catch (error) {
      console.error("Failed to load notifications from storage:", error);
    }
  }, []);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("Failed to save notifications to storage:", error);
    }
  }, [notifications]);

  const addNotification = useCallback((input: NotificationInput) => {
    const notification: Notification = {
      id: input.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      timestamp: input.timestamp || new Date(),
      read: input.read ?? false,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      icon: input.icon,
    };

    setNotifications((prev) => {
      // Добавляем новое уведомление в начало
      const updated = [notification, ...prev];
      // Ограничиваем количество уведомлений
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
