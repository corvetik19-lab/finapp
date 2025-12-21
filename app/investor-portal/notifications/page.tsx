"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Check,
} from "lucide-react";

interface Notification {
  id: string;
  type: "payment" | "overdue" | "info" | "success";
  title: string;
  message: string;
  date: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "payment",
    title: "Предстоящий платёж",
    message: "Через 7 дней ожидается возврат по инвестиции INV-2024-001 на сумму 1 125 000 ₽",
    date: "2024-03-14T10:00:00",
    read: false,
  },
  {
    id: "2",
    type: "success",
    title: "Платёж получен",
    message: "Получен возврат по инвестиции INV-2024-003: основной долг 500 000 ₽ + проценты 45 000 ₽",
    date: "2024-03-01T14:30:00",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Новый отчёт",
    message: "Сформирован ежемесячный отчёт за февраль 2024. Документ доступен в разделе 'Документы'",
    date: "2024-03-01T09:00:00",
    read: true,
  },
  {
    id: "4",
    type: "payment",
    title: "Напоминание о платеже",
    message: "Через 3 дня ожидается частичный возврат по INV-2024-015",
    date: "2024-02-28T10:00:00",
    read: true,
  },
  {
    id: "5",
    type: "success",
    title: "Инвестиция завершена",
    message: "Инвестиция INV-2024-002 успешно закрыта. Общий доход составил 180 000 ₽",
    date: "2024-02-15T16:00:00",
    read: true,
  },
];

const typeIcons: Record<string, typeof Bell> = {
  payment: Calendar,
  overdue: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const typeColors: Record<string, string> = {
  payment: "text-blue-500 bg-blue-50",
  overdue: "text-red-500 bg-red-50",
  info: "text-slate-500 bg-slate-50",
  success: "text-green-500 bg-green-50",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Сегодня, ${date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days === 1) {
    return `Вчера, ${date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days < 7) {
    return `${days} дн. назад`;
  } else {
    return date.toLocaleDateString("ru-RU");
  }
}

export default function InvestorNotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Уведомления</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} непрочитанных`
              : "Все уведомления прочитаны"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Отметить все прочитанными
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Нет уведомлений</p>
            <p className="text-sm text-muted-foreground">
              Здесь будут появляться важные уведомления о ваших инвестициях
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || "text-slate-500 bg-slate-50";

            return (
              <Card
                key={notification.id}
                className={`transition-colors ${!notification.read ? "bg-blue-50/50 border-blue-100" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-full ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-medium ${!notification.read ? "text-slate-900" : "text-slate-700"}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <Badge variant="default" className="bg-blue-500">Новое</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.date)}
                        </span>

                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Прочитано
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
