"use client";

import { useState, useEffect } from "react";
import styles from "./StreakWidget.module.css";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  last_activity_date: string | null;
}

export default function StreakWidget() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  async function loadStreak() {
    try {
      const res = await fetch("/api/gamification/streaks");
      if (res.ok) {
        const { streak: data } = await res.json();
        setStreak(data);
      }
    } catch (error) {
      console.error("Failed to load streak:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!streak || streak.current_streak === 0) {
    return (
      <div className={styles.widget}>
        <div className={styles.icon}>📝</div>
        <div className={styles.content}>
          <h3 className={styles.title}>Начните стрик!</h3>
          <p className={styles.description}>
            Добавляйте транзакции каждый день
          </p>
        </div>
      </div>
    );
  }

  const isHot = streak.current_streak >= 7;
  const isOnFire = streak.current_streak >= 30;

  return (
    <div className={`${styles.widget} ${isOnFire ? styles.onFire : isHot ? styles.hot : ""}`}>
      <div className={styles.icon}>
        {isOnFire ? "🔥" : isHot ? "⚡" : "✨"}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>
          {streak.current_streak} {getDaysLabel(streak.current_streak)} подряд!
        </h3>
        <p className={styles.description}>
          Максимум: {streak.longest_streak} {getDaysLabel(streak.longest_streak)}
        </p>
      </div>
      <div className={styles.badge}>
        <span className={styles.number}>{streak.current_streak}</span>
      </div>
    </div>
  );
}

function getDaysLabel(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }

  return "дней";
}
