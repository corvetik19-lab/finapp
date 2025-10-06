"use client";

import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";
import styles from "./NotificationBell.module.css";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Уведомления"
      >
        <span className="material-icons">{unreadCount > 0 ? "notifications_active" : "notifications"}</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
