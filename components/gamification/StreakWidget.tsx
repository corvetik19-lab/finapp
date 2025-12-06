"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    return <Card><CardContent className="flex items-center justify-center py-4"><span className="text-muted-foreground">Загрузка...</span></CardContent></Card>;
  }

  if (!streak || streak.current_streak === 0) {
    return <Card><CardContent className="flex items-center gap-3 py-4"><span className="text-2xl">📝</span><div><h3 className="font-medium">Начните стрик!</h3><p className="text-sm text-muted-foreground">Добавляйте транзакции каждый день</p></div></CardContent></Card>;
  }

  const isHot = streak.current_streak >= 7;
  const isOnFire = streak.current_streak >= 30;

  return (
    <Card className={cn(isOnFire && "bg-orange-50 dark:bg-orange-950 border-orange-300", isHot && !isOnFire && "bg-yellow-50 dark:bg-yellow-950 border-yellow-300")}>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="text-2xl">{isOnFire ? "🔥" : isHot ? "⚡" : "✨"}</span>
        <div className="flex-1"><h3 className="font-medium">{streak.current_streak} {getDaysLabel(streak.current_streak)} подряд!</h3><p className="text-sm text-muted-foreground">Максимум: {streak.longest_streak} {getDaysLabel(streak.longest_streak)}</p></div>
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-full text-white font-bold", isOnFire ? "bg-orange-500" : isHot ? "bg-yellow-500" : "bg-primary")}>{streak.current_streak}</div>
      </CardContent>
    </Card>
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
