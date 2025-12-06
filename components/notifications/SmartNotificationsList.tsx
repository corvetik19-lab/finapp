"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bell, X, AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb } from "lucide-react";

interface SmartNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "alert" | "success";
  action_url?: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    recommendation?: string;
    [key: string]: unknown;
  };
}

export default function SmartNotificationsList() {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchNotifications() {
    try {
      const url = `/api/notifications?${filter === "unread" ? "unread=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: true }),
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function dismiss(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_dismissed: true }),
      });

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "alert": return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  }

  function getSeverityStyle(severity: string) {
    switch (severity) {
      case "alert": return "bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/30 dark:to-transparent border border-red-200/50 dark:border-red-800/30";
      case "warning": return "bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/30 dark:to-transparent border border-yellow-200/50 dark:border-yellow-800/30";
      case "success": return "bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/30 dark:to-transparent border border-green-200/50 dark:border-green-800/30";
      default: return "bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent border border-blue-200/50 dark:border-blue-800/30";
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
    }
  }

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Уведомления</CardTitle>
          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Все</Button>
            <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Непрочитанные</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Bell className="h-12 w-12 opacity-30 mb-4" /><p>{filter === "unread" ? "Нет новых уведомлений" : "Уведомлений пока нет"}</p></div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div key={notification.id} className={cn("flex items-start gap-3 p-3 rounded-xl hover:shadow-md transition-all", getSeverityStyle(notification.severity), !notification.is_read && "ring-2 ring-primary/20", notification.action_url && "cursor-pointer")} onClick={() => { if (!notification.is_read) markAsRead(notification.id); if (notification.action_url) window.location.href = notification.action_url; }}>
                <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(notification.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><span className="font-medium">{notification.title}</span>{!notification.is_read && <Badge variant="secondary" className="text-xs">Новое</Badge>}</div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {notification.metadata?.recommendation && <div className="flex items-center gap-1 text-sm mt-2"><Lightbulb className="h-4 w-4 text-yellow-500" /><span>{notification.metadata.recommendation}</span></div>}
                  <div className="text-xs text-muted-foreground mt-2">{formatDate(notification.created_at)}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
