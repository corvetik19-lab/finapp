"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => {
        const color = rarityColors[notification.achievement.rarity] || rarityColors.common;
        return (
          <Card key={notification.timestamp} className="border-l-4 shadow-lg animate-in slide-in-from-right" style={{ borderLeftColor: color }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{notification.achievement.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">🎉 Достижение разблокировано!</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleClose(notification.timestamp)}><X className="h-4 w-4" /></Button>
                  </div>
                  <p className="font-medium">{notification.achievement.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.achievement.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge style={{ backgroundColor: color }}>{getRarityLabel(notification.achievement.rarity)}</Badge>
                    <span className="text-sm font-semibold text-primary">+{notification.achievement.points} XP</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
