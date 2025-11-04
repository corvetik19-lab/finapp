"use client";

import { useState } from "react";
import styles from "./NotificationCenter.module.css";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

interface NotificationCenterProps {
  notifications?: Notification[];
  unreadCount?: number;
}

export default function NotificationCenter({
  notifications = [],
  unreadCount = 0,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const typeIcons: Record<string, string> = {
    info: "info",
    success: "check_circle",
    warning: "warning",
    error: "error",
  };

  const typeColors: Record<string, string> = {
    info: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  };

  const handleMarkAllRead = () => {
    // TODO: API call to mark all as read
    console.log("Mark all as read");
  };

  const handleClearAll = () => {
    // TODO: API call to clear all
    console.log("Clear all");
  };

  return (
    <div className={styles.notificationCenter}>
      <button
        className={styles.notificationButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Уведомления"
      >
        <span className="material-icons">notifications</span>
        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className={styles.notificationOverlay}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.notificationDropdown}>
            <div className={styles.notificationHeader}>
              <h3>Уведомления</h3>
              {unreadCount > 0 && (
                <span className={styles.unreadCount}>
                  {unreadCount} {unreadCount === 1 ? "новое" : "новых"}
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <div className={styles.notificationActions}>
                <button
                  className={styles.actionButton}
                  onClick={handleMarkAllRead}
                >
                  <span className="material-icons">done_all</span>
                  Прочитать все
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handleClearAll}
                >
                  <span className="material-icons">clear_all</span>
                  Очистить
                </button>
              </div>
            )}

            <div className={styles.notificationList}>
              {notifications.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className="material-icons">notifications_none</span>
                  <p>Нет уведомлений</p>
                  <span className={styles.emptyText}>
                    Вы получите уведомление, когда произойдёт что-то важное
                  </span>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${
                      !notification.read ? styles.notificationItemUnread : ""
                    }`}
                  >
                    <div
                      className={styles.notificationIcon}
                      style={{ background: `${typeColors[notification.type]}20` }}
                    >
                      <span
                        className="material-icons"
                        style={{ color: typeColors[notification.type] }}
                      >
                        {typeIcons[notification.type]}
                      </span>
                    </div>
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationTitle}>
                        {notification.title}
                        {!notification.read && (
                          <span className={styles.unreadDot} />
                        )}
                      </div>
                      <div className={styles.notificationMessage}>
                        {notification.message}
                      </div>
                      <div className={styles.notificationFooter}>
                        <span className={styles.notificationTime}>
                          {notification.timestamp}
                        </span>
                        {notification.action && (
                          <a
                            href={notification.action.href}
                            className={styles.notificationAction}
                            onClick={() => setIsOpen(false)}
                          >
                            {notification.action.label}
                            <span className="material-icons">arrow_forward</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className={styles.notificationFooter}>
                <a href="/notifications" onClick={() => setIsOpen(false)}>
                  Показать все уведомления
                  <span className="material-icons">arrow_forward</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
