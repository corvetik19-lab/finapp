"use client";

import { useEffect, useState } from "react";
import styles from "./AchievementNotification.module.css";

interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: string;
}

interface Notification {
  achievement: Achievement;
  timestamp: number;
}

const NOTIFICATION_DURATION = 5000; // 5 секунд
const rarityColors: Record<string, string> = {
  common: "#10b981",
  rare: "#3b82f6",
  epic: "#8b5cf6",
  legendary: "#f59e0b",
};

export default function AchievementNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Слушаем события разблокировки достижений
    const handleAchievementUnlocked = (event: Event) => {
      const customEvent = event as CustomEvent<Achievement>;
      const achievement = customEvent.detail;
      const notification: Notification = {
        achievement,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Автоматически удаляем через 5 секунд
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.timestamp !== notification.timestamp)
        );
      }, NOTIFICATION_DURATION);
    };

    window.addEventListener(
      "achievement-unlocked",
      handleAchievementUnlocked
    );

    return () => {
      window.removeEventListener(
        "achievement-unlocked",
        handleAchievementUnlocked
      );
    };
  }, []);

  const handleClose = (timestamp: number) => {
    setNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {notifications.map((notification) => {
        const color = rarityColors[notification.achievement.rarity] || rarityColors.common;

        return (
          <div
            key={notification.timestamp}
            className={styles.notification}
            style={{ borderLeftColor: color }}
          >
            <div className={styles.icon}>{notification.achievement.icon}</div>

            <div className={styles.content}>
              <div className={styles.header}>
                <h3 className={styles.title}>🎉 Достижение разблокировано!</h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => handleClose(notification.timestamp)}
                >
                  ✕
                </button>
              </div>

              <p className={styles.achievementTitle}>
                {notification.achievement.title}
              </p>
              <p className={styles.description}>
                {notification.achievement.description}
              </p>

              <div className={styles.footer}>
                <span
                  className={styles.rarity}
                  style={{ backgroundColor: color }}
                >
                  {getRarityLabel(notification.achievement.rarity)}
                </span>
                <span className={styles.points}>
                  +{notification.achievement.points} XP
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: "Обычное",
    rare: "Редкое",
    epic: "Эпическое",
    legendary: "Легендарное",
  };
  return labels[rarity] || rarity;
}

// Хелпер для триггера события
export function notifyAchievementUnlocked(achievement: Achievement) {
  const event = new CustomEvent("achievement-unlocked", {
    detail: achievement,
  });
  window.dispatchEvent(event);
}
