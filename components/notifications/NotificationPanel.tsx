"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/notifications/types";
import styles from "./NotificationPanel.module.css";

type NotificationPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();
  const router = useRouter();

  if (!isOpen) return null;

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.icon) return notification.icon;
    
    switch (notification.type) {
      case "success":
        return "check_circle";
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
      default:
        return "info";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Только что";
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days === 1) return "Вчера";
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <>
      {/* Overlay для закрытия при клике вне панели */}
      <div className={styles.overlay} onClick={onClose} />
      
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Уведомления</h3>
            {notifications.length > 0 && (
              <span className={styles.count}>
                {notifications.filter((n) => !n.read).length} новых
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  className={styles.headerButton}
                  onClick={markAllAsRead}
                  title="Отметить все как прочитанные"
                >
                  <span className="material-icons">done_all</span>
                </button>
                <button
                  type="button"
                  className={styles.headerButton}
                  onClick={clearAll}
                  title="Очистить все"
                >
                  <span className="material-icons">clear_all</span>
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.headerButton}
              onClick={() => {
                router.push("/settings/notifications");
                onClose();
              }}
              title="Настройки уведомлений"
            >
              <span className="material-icons">settings</span>
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              title="Закрыть"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <span className="material-icons" style={{ fontSize: 48, opacity: 0.3 }}>
                notifications_none
              </span>
              <p>Нет уведомлений</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.item} ${!notification.read ? styles.unread : ""} ${
                  styles[`type-${notification.type}`]
                } ${notification.actionUrl ? styles.clickable : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.iconWrapper}>
                  <span className={`material-icons ${styles.icon}`}>
                    {getNotificationIcon(notification)}
                  </span>
                </div>
                <div className={styles.content}>
                  <div className={styles.itemHeader}>
                    <h4 className={styles.itemTitle}>{notification.title}</h4>
                    <span className={styles.time}>{formatTime(notification.timestamp)}</span>
                  </div>
                  <p className={styles.message}>{notification.message}</p>
                  {notification.actionLabel && notification.actionUrl && (
                    <div className={styles.action}>
                      <span className={styles.actionLabel}>
                        {notification.actionLabel}
                        <span className="material-icons" style={{ fontSize: 16 }}>
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  title="Удалить"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
