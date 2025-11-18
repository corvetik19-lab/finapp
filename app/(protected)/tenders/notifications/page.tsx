'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  priority: string;
  created_at: string;
  tender_id: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === 'unread' 
        ? '/api/tenders/notifications?unread_only=true&limit=100'
        : '/api/tenders/notifications?limit=100';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed');
      
      const data = await response.json();
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/tenders/notifications/${id}`, { method: 'PATCH' });
      loadNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Удалить уведомление?')) return;
    try {
      await fetch(`/api/tenders/notifications/${id}`, { method: 'DELETE' });
      loadNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      deadline_approaching: '⏰',
      deadline_passed: '🚨',
      stage_changed: '🔄',
      assigned: '👤',
      comment_added: '💬',
      file_uploaded: '📎',
      status_changed: '📊',
      reminder: '🔔',
      system: 'ℹ️',
    };
    return icons[type] || '🔔';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Срочно' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Высокий' },
      normal: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Обычный' },
      low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Низкий' },
    };
    const badge = badges[priority] || badges.normal;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔔 Уведомления</h1>
          <p className="text-gray-600 mt-1">
            Всего: {notifications.length} • Непрочитанных: {unreadCount}
          </p>
        </div>
        <Link
          href="/tenders/notifications/settings"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ⚙️ Настройки
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Все ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Непрочитанные ({unreadCount})
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
          </h3>
          <p className="text-gray-600">
            {filter === 'unread' 
              ? 'Все уведомления прочитаны'
              : 'Уведомления будут появляться здесь'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg border p-4 ${
                !notification.is_read ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">
                  {getIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-gray-700">{notification.message}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getPriorityBadge(notification.priority)}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          title="Пометить как прочитанное"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatDate(notification.created_at)}</span>
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Перейти →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
