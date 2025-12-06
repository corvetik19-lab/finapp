'use client';

import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Kanban, Loader2 } from "lucide-react";

interface Tender {
  id: string;
  number: string;
  name: string;
  status: string;
  nmck: number;
  deadline: string | null;
}

interface EmployeeTendersKanbanProps {
  employeeId: string;
}

const KANBAN_COLUMNS = [
  { id: 'draft', label: 'Черновик', color: '#94a3b8', icon: '📝' },
  { id: 'preparation', label: 'Подготовка', color: '#f59e0b', icon: '⚙️' },
  { id: 'submitted', label: 'Подана', color: '#3b82f6', icon: '📤' },
  { id: 'consideration', label: 'Рассмотрение', color: '#8b5cf6', icon: '🔍' },
  { id: 'won', label: 'Выиграна', color: '#22c55e', icon: '🏆' },
  { id: 'lost', label: 'Проиграна', color: '#ef4444', icon: '❌' },
];

export function EmployeeTendersKanban({ employeeId }: EmployeeTendersKanbanProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenders = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/tenders`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки тендеров');
        }

        const data = await response.json();
        setTenders(data);
      } catch (err) {
        console.error('Error loading tenders:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadTenders();
  }, [employeeId]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const getTendersByStatus = (status: string) => {
    return tenders.filter(t => t.status === status);
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка канбана...</div>;
  if (error) return <div className="text-center py-8 text-destructive"><span>❌</span> {error}</div>;
  if (tenders.length === 0) return <div className="text-center py-8"><Kanban className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Нет назначенных тендеров</p></div>;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {KANBAN_COLUMNS.map(column => {
          const columnTenders = getTendersByStatus(column.id);
          return <div key={column.id} className="w-56 flex-shrink-0"><div className="flex items-center gap-2 p-2 rounded-t border-t-4" style={{ borderTopColor: column.color }}><span>{column.icon}</span><span className="text-sm font-medium">{column.label}</span><Badge style={{ background: column.color }}>{columnTenders.length}</Badge></div><div className="space-y-2 min-h-[100px] bg-muted/30 p-2 rounded-b">{columnTenders.map(t => <a key={t.id} href={`/tenders/${t.id}`} className="block p-2 bg-background border rounded hover:shadow-md transition-shadow"><div className="text-xs text-muted-foreground">#{t.number}</div><div className="text-sm font-medium line-clamp-2">{t.name}</div><div className="flex flex-wrap gap-1 mt-1 text-xs"><span className="text-green-600 font-medium">{formatMoney(t.nmck)}</span>{t.deadline && <span className="text-muted-foreground">📅 {new Date(t.deadline).toLocaleDateString('ru-RU')}</span>}</div></a>)}{columnTenders.length === 0 && <div className="text-xs text-center text-muted-foreground py-4">Нет тендеров</div>}</div></div>;
        })}
      </div>
    </div>
  );
}
