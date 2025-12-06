'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/tenders/types';
import type { TenderStageHistory, TenderFieldHistory, TenderStage } from '@/lib/tenders/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, History, Pencil, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface TenderHistoryProps {
  tenderId: string;
  stages: TenderStage[];
}

type HistoryItem =
  | (TenderStageHistory & { type: 'stage_change' })
  | (TenderFieldHistory & { type: 'field_change' });

export function TenderHistory({ tenderId, stages }: TenderHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tenderId}/history`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка загрузки истории');
      }

      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'Не указан';
    const stage = stages.find((s) => s.id === stageId);
    return stage?.name || 'Неизвестный этап';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldName = (field: string) => {
    const map: Record<string, string> = {
      status: 'Статус',
      nmck: 'НМЦК',
      submission_deadline: 'Дата подачи',
      manager_id: 'Менеджер',
      stage_id: 'Этап',
    };
    return map[field] || field;
  };

  const formatFieldValue = (field: string, value: string | null) => {
    if (!value || value === 'null') return '—';
    if (field === 'nmck') return formatCurrency(Number(value));
    if (field === 'submission_deadline') return formatDate(value);
    if (field === 'status') {
      const statusMap: Record<string, string> = {
        active: 'Активен',
        won: 'Выигран',
        lost: 'Проигран',
        archived: 'В архиве',
      };
      return statusMap[value] || value;
    }
    return value;
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Загрузка истории...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-600 mb-2">Ошибка</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-12">
        <History className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">История пуста</h3>
        <p className="text-gray-500">Изменения этапов тендера будут отображаться здесь</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {history.map((item, index) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'stage_change' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {item.type === 'stage_change' ? <RefreshCw className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                </div>
                {index < history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-2" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {item.type === 'stage_change' ? 'Смена этапа' : `Изменение поля "${getFieldName('field_name' in item ? item.field_name : '')}"`}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{formatDate(item.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={item.changed_by_user?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{item.changed_by_user?.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <span>{item.changed_by_user?.full_name || 'Пользователь'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {item.type === 'stage_change' ? (
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="bg-gray-50">{getStageName((item as TenderStageHistory).from_stage_id)}</Badge>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <Badge className="bg-blue-600">{getStageName((item as TenderStageHistory).to_stage_id)}</Badge>
                  </div>
                ) : (
                  'field_name' in item && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-gray-500 line-through">{formatFieldValue(item.field_name, item.old_value)}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-green-600">{formatFieldValue(item.field_name, item.new_value)}</span>
                    </div>
                  )
                )}

                {item.type === 'stage_change' && (item as TenderStageHistory).comment && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 italic">&quot;{(item as TenderStageHistory).comment}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
