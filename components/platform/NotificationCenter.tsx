"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bell, BellOff, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

interface NotificationCenterProps {
  notifications?: Notification[];
  unreadCount?: number;
}

export default function NotificationCenter({
  notifications = [],
  unreadCount = 0,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const TypeIcons: Record<string, typeof Info> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };

  const typeColors: Record<string, string> = {
    info: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  };

  const handleMarkAllRead = () => {
    // TODO: API call to mark all as read
    console.log("Mark all as read");
  };

  const handleClearAll = () => {
    // TODO: API call to clear all
    console.log("Clear all");
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative"><Bell className="h-5 w-5" />{unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs" variant="destructive">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}</Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-96 bg-popover border rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">Уведомления</h3>{unreadCount > 0 && <Badge variant="secondary">{unreadCount} новых</Badge>}</div>
            {notifications.length > 0 && <div className="flex gap-2 p-2 border-b"><Button variant="ghost" size="sm" onClick={handleMarkAllRead}><CheckCheck className="h-4 w-4 mr-1" />Прочитать все</Button><Button variant="ghost" size="sm" onClick={handleClearAll}><Trash2 className="h-4 w-4 mr-1" />Очистить</Button></div>}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><BellOff className="h-12 w-12 mb-2" /><p className="font-medium">Нет уведомлений</p><p className="text-sm text-center px-4">Вы получите уведомление, когда произойдёт что-то важное</p></div>
              ) : notifications.map((notification) => {
                const Icon = TypeIcons[notification.type];
                return (
                  <div key={notification.id} className={cn("flex gap-3 p-3 border-b last:border-0", !notification.read && "bg-primary/5")}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${typeColors[notification.type]}20` }}><Icon className="h-5 w-5" style={{ color: typeColors[notification.type] }} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="font-medium text-sm">{notification.title}</span>{!notification.read && <span className="w-2 h-2 rounded-full bg-primary" />}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between mt-1"><span className="text-xs text-muted-foreground">{notification.timestamp}</span>{notification.action && <a href={notification.action.href} onClick={() => setIsOpen(false)} className="text-xs text-primary flex items-center gap-1">{notification.action.label}<ArrowRight className="h-3 w-3" /></a>}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {notifications.length > 0 && <div className="p-2 border-t"><a href="/notifications" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2 text-sm text-primary py-2 hover:underline">Показать все уведомления<ArrowRight className="h-4 w-4" /></a></div>}
          </div>
        </>
      )}
    </div>
  );
}
