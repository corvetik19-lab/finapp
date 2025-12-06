"use client";

import { useEffect, useState } from "react";
import { syncService } from "@/lib/offline/sync";
import { Badge } from "@/components/ui/badge";
import { WifiOff, RefreshCw, Clock } from "lucide-react";

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
    <div className="fixed bottom-4 left-4 z-50">
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Офлайн режим</span>
          {pendingCount > 0 && <Badge variant="destructive">{pendingCount}</Badge>}
        </div>
      )}
      {isOnline && isSyncing && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-lg">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Синхронизация...</span>
        </div>
      )}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 shadow-lg">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Ожидает синхронизации: {pendingCount}</span>
        </div>
      )}
    </div>
  );
}
