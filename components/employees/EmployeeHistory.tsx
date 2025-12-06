'use client';

import { useState, useEffect } from 'react';
import { History, Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  action: 'created' | 'updated' | 'role_changed' | 'status_changed' | 'deleted';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  comment: string | null;
  changed_by: string | null;
}

interface EmployeeHistoryProps {
  employeeId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Создан',
  updated: 'Изменён',
  role_changed: 'Изменена роль',
  status_changed: 'Изменён статус',
  deleted: 'Удалён',
};

const ACTION_ICONS: Record<string, string> = {
  created: '✨',
  updated: '✏️',
  role_changed: '🔐',
  status_changed: '🔄',
  deleted: '🗑️',
};

const FIELD_LABELS: Record<string, string> = {
  full_name: 'ФИО',
  email: 'Email',
  phone: 'Телефон',
  position: 'Должность',
  department: 'Отдел',
  role: 'Роль',
  role_id: 'Роль',
  status: 'Статус',
  hire_date: 'Дата приёма',
  telegram: 'Telegram',
  avatar_url: 'Фото',
};

export function EmployeeHistory({ employeeId }: EmployeeHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/history`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки истории');
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error('Error loading history:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [employeeId]);

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка истории...</div>;
  if (error) return <div className="text-center py-8 text-destructive"><span>❌</span> {error}</div>;
  if (history.length === 0) return <div className="text-center py-8"><History className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">История пуста</p><p className="text-xs text-muted-foreground">Здесь будут изменения</p></div>;

  return (
    <div className="space-y-3">
      {history.map(item => <div key={item.id} className="flex gap-3 p-3 border rounded">
        <div className="text-lg">{ACTION_ICONS[item.action] || '📝'}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between"><span className="font-medium text-sm">{ACTION_LABELS[item.action] || item.action}</span><span className="text-xs text-muted-foreground">{new Date(item.changed_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
          {item.field_name && <div className="text-sm mt-1"><span className="text-muted-foreground">{FIELD_LABELS[item.field_name] || item.field_name}:</span>{item.old_value && <span className="line-through text-red-500 mx-1">{item.old_value}</span>}{item.old_value && item.new_value && <span>→</span>}{item.new_value && <span className="text-green-600 mx-1">{item.new_value}</span>}</div>}
          {item.comment && <div className="text-xs text-muted-foreground mt-1">💬 {item.comment}</div>}
        </div>
      </div>)}
    </div>
  );
}
