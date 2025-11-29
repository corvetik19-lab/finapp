'use client';

import { useState, useEffect } from 'react';
import styles from './EmployeeNotifications.module.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  is_read: boolean;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface EmployeeNotificationsProps {
  onUnreadCountChange?: (count: number) => void;
}

export function EmployeeNotifications({ onUnreadCountChange }: EmployeeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    onUnreadCountChange?.(unreadCount);
  }, [notifications, onUnreadCountChange]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/employees/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });

      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/employees/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/employees/notifications?id=${id}`, {
        method: 'DELETE'
      });

      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayedNotifications = showAll 
    ? notifications 
    : notifications.slice(0, 5);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          🔔 Уведомления
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </h4>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllButton}>
            Прочитать все
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔕</span>
          <p>Нет уведомлений</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notification} ${!notification.is_read ? styles.unread : ''}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className={styles.notificationIcon}>
                  {notification.icon}
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationTitle}>
                    {notification.title}
                  </div>
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div className={styles.notificationMeta}>
                    <span className={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </span>
                    {notification.employee && (
                      <span className={styles.notificationEmployee}>
                        {notification.employee.full_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  className={styles.deleteButton}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {notifications.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={styles.showMoreButton}
            >
              {showAll ? '▲ Свернуть' : `▼ Показать все (${notifications.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
