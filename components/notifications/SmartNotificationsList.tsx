"use client";

import { useState, useEffect } from "react";
import styles from "./SmartNotificationsList.module.css";

interface SmartNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "alert" | "success";
  action_url?: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    recommendation?: string;
    [key: string]: unknown;
  };
}

export default function SmartNotificationsList() {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchNotifications() {
    try {
      const url = `/api/notifications?${filter === "unread" ? "unread=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: true }),
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function dismiss(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_dismissed: true }),
      });

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "alert":
        return "⚠️";
      case "warning":
        return "⚡";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  }

  function getSeverityClass(severity: string) {
    return styles[severity] || styles.info;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
    }
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Уведомления</h2>
        <div className={styles.filters}>
          <button
            className={filter === "all" ? styles.active : ""}
            onClick={() => setFilter("all")}
          >
            Все
          </button>
          <button
            className={filter === "unread" ? styles.active : ""}
            onClick={() => setFilter("unread")}
          >
            Непрочитанные
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔔</div>
          <p>
            {filter === "unread"
              ? "Нет новых уведомлений"
              : "Уведомлений пока нет"}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`${styles.notification} ${getSeverityClass(notification.severity)} ${!notification.is_read ? styles.unread : ""}`}
              onClick={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
                if (notification.action_url) {
                  window.location.href = notification.action_url;
                }
              }}
            >
              <div className={styles.icon}>
                {getSeverityIcon(notification.severity)}
              </div>
              <div className={styles.content}>
                <div className={styles.notificationTitle}>
                  {notification.title}
                  {!notification.is_read && (
                    <span className={styles.badge}>Новое</span>
                  )}
                </div>
                <div className={styles.message}>{notification.message}</div>
                {notification.metadata?.recommendation && (
                  <div className={styles.recommendation}>
                    💡 {notification.metadata.recommendation}
                  </div>
                )}
                <div className={styles.meta}>
                  {formatDate(notification.created_at)}
                </div>
              </div>
              <button
                className={styles.dismissBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(notification.id);
                }}
                title="Закрыть"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
