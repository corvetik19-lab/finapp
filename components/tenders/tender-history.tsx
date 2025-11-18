'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TenderStageHistory, TenderStage } from '@/lib/tenders/types';

interface TenderHistoryProps {
  tenderId: string;
  stages: TenderStage[];
}

export function TenderHistory({ tenderId, stages }: TenderHistoryProps) {
  const [history, setHistory] = useState<TenderStageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tenderId}/history`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки истории');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">⚠️ Ошибка</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          История пуста
        </h3>
        <p className="text-gray-600">
          Изменения этапов тендера будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-icons text-blue-600 text-xl">
                  swap_horiz
                </span>
              </div>
              {index < history.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Изменение этапа
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {getStageName(item.from_stage_id)}
                </span>
                <span className="material-icons text-gray-400">arrow_forward</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {getStageName(item.to_stage_id)}
                </span>
              </div>

              {item.comment && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{item.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
