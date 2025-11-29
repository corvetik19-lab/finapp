'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/tenders/types';
import type { TenderStageHistory, TenderFieldHistory, TenderStage } from '@/lib/tenders/types';
import styles from './tender-history.module.css';

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
      <div className={styles.centerState}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.errorTitle}>⚠️ Ошибка</div>
        <p className={styles.emptyText}>{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={styles.centerState}>
        <div className={styles.emptyIcon}>📋</div>
        <h3 className={styles.emptyTitle}>История пуста</h3>
        <p className={styles.emptyText}>
          Изменения этапов тендера будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {history.map((item, index) => (
        <div key={item.id} className={styles.card}>
          <div className={styles.itemLayout}>
            {/* Timeline indicator */}
            <div className={styles.timelineColumn}>
              <div className={`${styles.timelineIcon} ${item.type === 'stage_change' ? styles.iconStage : styles.iconField}`}>
                <span className="material-icons">
                  {item.type === 'stage_change' ? 'swap_horiz' : 'edit'}
                </span>
              </div>
              {index < history.length - 1 && (
                <div className={styles.timelineLine}></div>
              )}
            </div>

            {/* Content */}
            <div className={styles.contentColumn}>
              <div className={styles.header}>
                <div>
                  <h4 className={styles.title}>
                    {item.type === 'stage_change'
                      ? 'Смена этапа'
                      : `Изменение поля "${getFieldName('field_name' in item ? item.field_name : '')}"`}
                  </h4>
                  <div className={styles.meta}>
                    <span className={styles.date}>{formatDate(item.created_at)}</span>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {item.changed_by_user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.changed_by_user.avatar_url}
                            alt=""
                            className={styles.avatar}
                          />
                        ) : (
                          item.changed_by_user?.full_name?.[0] || '?'
                        )}
                      </div>
                      <span className={styles.userName}>
                        {item.changed_by_user?.full_name || 'Пользователь'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {item.type === 'stage_change' ? (
                <div className={styles.stageChangeBlock}>
                  <span className={styles.stageTag}>
                    {getStageName((item as TenderStageHistory).from_stage_id)}
                  </span>
                  <span className={`material-icons ${styles.arrowIcon}`}>arrow_forward</span>
                  <span className={`${styles.stageTag} ${styles.stageTagNew}`}>
                    {getStageName((item as TenderStageHistory).to_stage_id)}
                  </span>
                </div>
              ) : (
                'field_name' in item && (
                  <div className={styles.fieldChangeBlock}>
                    <span className={styles.oldValue}>
                      {formatFieldValue(item.field_name, item.old_value)}
                    </span>
                    <span className={`material-icons ${styles.arrowIcon}`}>arrow_forward</span>
                    <span className={styles.newValue}>
                      {formatFieldValue(item.field_name, item.new_value)}
                    </span>
                  </div>
                )
              )}

              {item.type === 'stage_change' && (item as TenderStageHistory).comment && (
                <div className={styles.commentBlock}>
                  <p className={styles.commentText}>
                    &quot;{(item as TenderStageHistory).comment}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
