'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  is_read: boolean;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface EmployeeNotificationsProps {
  onUnreadCountChange?: (count: number) => void;
}

export function EmployeeNotifications({ onUnreadCountChange }: EmployeeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    onUnreadCountChange?.(unreadCount);
  }, [notifications, onUnreadCountChange]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/employees/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });

      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/employees/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/employees/notifications?id=${id}`, {
        method: 'DELETE'
      });

      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayedNotifications = showAll 
    ? notifications 
    : notifications.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h4 className="font-semibold flex items-center gap-2"><Bell className="h-5 w-5" />Уведомления{unreadCount > 0 && <Badge>{unreadCount}</Badge>}</h4>{unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead}>Прочитать все</Button>}</div>

      {notifications.length === 0 ? <div className="text-center py-8"><BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Нет уведомлений</p></div> : <>
        <div className="space-y-2">{displayedNotifications.map(n => <Card key={n.id} className={`cursor-pointer transition-colors ${!n.is_read ? 'border-blue-500 bg-blue-50/50' : ''}`} onClick={() => !n.is_read && markAsRead(n.id)}><CardContent className="pt-3 flex items-start gap-3"><span className="text-xl">{n.icon}</span><div className="flex-1"><div className="font-medium text-sm">{n.title}</div><div className="text-sm text-muted-foreground">{n.message}</div><div className="text-xs text-muted-foreground mt-1">{formatTime(n.created_at)}{n.employee && <> • {n.employee.full_name}</>}</div></div><Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}><X className="h-3 w-3" /></Button></CardContent></Card>)}</div>
        {notifications.length > 5 && <Button variant="ghost" className="w-full" onClick={() => setShowAll(!showAll)}>{showAll ? <><ChevronUp className="h-4 w-4 mr-1" />Свернуть</> : <><ChevronDown className="h-4 w-4 mr-1" />Показать все ({notifications.length})</>}</Button>}
      </>}
    </div>
  );
}
