'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 60000; // 1 минута

export function useOnlineStatus() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/users/heartbeat', { method: 'POST' });
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    // Отправляем сразу при загрузке
    sendHeartbeat();

    // Затем периодически
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // При закрытии страницы
    const handleBeforeUnload = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}

// Функция для проверки онлайн-статуса (последняя активность < 5 минут)
export function isUserOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
  
  return diffMinutes < 5;
}

// Форматирование времени последней активности
export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Не в сети';
  
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 1000 / 60);
  
  if (diffMinutes < 1) return 'В сети';
  if (diffMinutes < 5) return 'В сети';
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дн назад`;
  
  return lastSeen.toLocaleDateString('ru-RU');
}
