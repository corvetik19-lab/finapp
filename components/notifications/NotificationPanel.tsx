"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/notifications/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, CheckCheck, Trash2, Settings, Bell, CheckCircle, AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";

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
    switch (notification.type) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error": return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
      default: return <Info className="h-5 w-5 text-blue-500" />;
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
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <Card className="fixed top-16 right-4 z-50 w-96 max-h-[80vh] overflow-hidden shadow-xl">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-base">Уведомления</CardTitle>{notifications.length > 0 && <span className="text-xs text-muted-foreground">{notifications.filter((n) => !n.read).length} новых</span>}</div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={markAllAsRead} title="Отметить все"><CheckCheck className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearAll} title="Очистить"><Trash2 className="h-4 w-4" /></Button></>}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { router.push("/settings/notifications"); onClose(); }} title="Настройки"><Settings className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Bell className="h-12 w-12 opacity-30 mb-2" /><p>Нет уведомлений</p></div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className={cn("flex items-start gap-3 p-3 border-b last:border-0 hover:bg-muted/50 transition-colors", !notification.read && "bg-primary/5", notification.actionUrl && "cursor-pointer")} onClick={() => handleNotificationClick(notification)}>
                <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><h4 className="font-medium text-sm truncate">{notification.title}</h4><span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(notification.timestamp)}</span></div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                  {notification.actionLabel && notification.actionUrl && <div className="flex items-center gap-1 text-xs text-primary mt-1">{notification.actionLabel}<ArrowRight className="h-3 w-3" /></div>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}><X className="h-3 w-3" /></Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
