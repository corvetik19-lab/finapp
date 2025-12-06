'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from "lucide-react";

interface ActivityData {
  month: string;
  tenders_count: number;
  won_count: number;
  lost_count: number;
}

interface EmployeeActivityChartProps {
  employeeId: string;
}

export function EmployeeActivityChart({ employeeId }: EmployeeActivityChartProps) {
  const [data, setData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}/activity`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error loading activity:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [employeeId]);

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка графика...</div>;
  if (error) return <div className="text-center py-8 text-destructive"><span>❌</span> {error}</div>;
  if (data.length === 0) return <div className="text-center py-8"><BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Нет данных</p></div>;

  const maxValue = Math.max(...data.map(d => d.tenders_count), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" />Всего</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" />Выиграно</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Проиграно</div>
      </div>
      <div className="flex items-end gap-2 h-40">
        {data.map((item, idx) => <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 h-32 w-full justify-center">
            <div className="w-3 bg-blue-500 rounded-t transition-all" style={{ height: `${(item.tenders_count / maxValue) * 100}%` }} title={`Всего: ${item.tenders_count}`} />
            <div className="w-3 bg-green-500 rounded-t transition-all" style={{ height: `${(item.won_count / maxValue) * 100}%` }} title={`Выиграно: ${item.won_count}`} />
            <div className="w-3 bg-red-500 rounded-t transition-all" style={{ height: `${(item.lost_count / maxValue) * 100}%` }} title={`Проиграно: ${item.lost_count}`} />
          </div>
          <span className="text-xs text-muted-foreground">{item.month}</span>
        </div>)}
      </div>
    </div>
  );
}
