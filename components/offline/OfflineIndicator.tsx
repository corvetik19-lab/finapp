"use client";

import { useEffect, useState } from "react";
import { syncService } from "@/lib/offline/sync";
import styles from "./OfflineIndicator.module.css";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Инициализировать синхронизацию
    syncService.startAutoSync();

    // Обработчики событий
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Проверять статус каждые 5 секунд
    const interval = setInterval(async () => {
      const status = await syncService.getStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    }, 5000);

    // Начальная проверка
    syncService.getStatus().then((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      syncService.stopAutoSync();
    };
  }, []);

  // Не показывать если онлайн и нет операций
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={styles.container}>
      {!isOnline && (
        <div className={`${styles.indicator} ${styles.offline}`}>
          <span className={styles.icon}>📴</span>
          <span className={styles.text}>Офлайн режим</span>
          {pendingCount > 0 && (
            <span className={styles.badge}>{pendingCount}</span>
          )}
        </div>
      )}

      {isOnline && isSyncing && (
        <div className={`${styles.indicator} ${styles.syncing}`}>
          <span className={styles.icon}>🔄</span>
          <span className={styles.text}>Синхронизация...</span>
        </div>
      )}

      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className={`${styles.indicator} ${styles.pending}`}>
          <span className={styles.icon}>⏳</span>
          <span className={styles.text}>
            Ожидает синхронизации: {pendingCount}
          </span>
        </div>
      )}
    </div>
  );
}
