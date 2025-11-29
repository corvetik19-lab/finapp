'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenderKanban } from '@/components/tenders/tender-kanban';
import { AddContractModal } from '@/components/tenders/AddContractModal';
import type { Tender, TenderStage } from '@/lib/tenders/types';
import { subscribeToStagesUpdates } from '@/lib/tenders/events';
import { useToast } from '@/components/toast/ToastContext';
import styles from '../tenders.module.css';

interface TenderRealizationClientProps {
  stages: TenderStage[];
  companyId: string | null;
}

export function TenderRealizationClient({ stages: initialStages, companyId }: TenderRealizationClientProps) {
  const [stages, setStages] = useState<TenderStage[]>(initialStages);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tendersByStage, setTendersByStage] = useState<Record<string, Tender[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowBackwardMovement, setAllowBackwardMovement] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  const loadTenders = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Загружаем тендеры из этапов реализации
      const stageIds = stages.map(s => s.id);
      
      const params = new URLSearchParams({
        company_id: companyId,
        limit: '1000',
      });

      const response = await fetch(`/api/tenders?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки контрактов');
      }

      const data = await response.json();
      const allTenders = data || [];
      
      // Фильтруем только тендеры из этапов реализации
      const realizationTenders = allTenders.filter((t: Tender) => 
        stageIds.includes(t.stage_id)
      );
      
      setTenders(realizationTenders);

      // Группируем по этапам реализации
      const grouped: Record<string, Tender[]> = {};
      stages.forEach((stage) => {
        grouped[stage.id] = realizationTenders.filter(
          (t: Tender) => t.stage_id === stage.id
        );
      });
      setTendersByStage(grouped);
    } catch (err) {
      console.error('Error loading tenders:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [companyId, stages]);

  const loadStages = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/tenders/stages?company_id=${companyId}`);
      if (response.ok) {
        const result = await response.json();
        const allStages = result.data || [];
        const realizationStages = allStages.filter((s: TenderStage) => s.category === 'realization');
        setStages(realizationStages);
      }
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  }, [companyId]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/tenders/settings/notifications');
      if (response.ok) {
        const result = await response.json();
        setAllowBackwardMovement(result.data?.allow_backward_movement || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    loadTenders();
    loadSettings();
  }, [loadTenders]);

  // Подписка на обновления этапов
  useEffect(() => {
    const unsubscribe = subscribeToStagesUpdates(() => {
      console.log('Stages updated, reloading...');
      loadStages();
    });

    return unsubscribe;
  }, [loadStages]);

  const handleStageChange = async (tenderId: string, newStageId: string) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: newStageId }),
      });

      if (!response.ok) {
        throw new Error('Ошибка изменения этапа');
      }

      await loadTenders();
    } catch (err) {
      console.error('Error changing stage:', err);
      alert('Ошибка при изменении этапа');
    }
  };

  const handleSelectTender = async (tender: Tender) => {
    try {
      // Находим первый этап реализации (Новые контракты в реализацию)
      const firstRealizationStage = stages.find(s => 
        s.name === 'Новые контракты в реализацию' || s.order_index === 0
      ) || stages[0];
      
      if (!firstRealizationStage) {
        alert('Не найден этап реализации');
        return;
      }

      // Перемещаем тендер в первый этап реализации
      const response = await fetch(`/api/tenders/${tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stage_id: firstRealizationStage.id,
          status: 'won' // Устанавливаем статус "выигран"
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка добавления контракта');
      }

      // Создаём/привязываем заказчика
      if (tender.customer) {
        try {
          await fetch('/api/tenders/customers/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tender_id: tender.id,
              customer_name: tender.customer,
              region: tender.city || null
            }),
          });
        } catch (customerErr) {
          console.error('Error creating customer:', customerErr);
          // Не блокируем добавление контракта если заказчик не создался
        }
      }

      setShowAddModal(false);
      await loadTenders();
      toast.show(`Контракт "${tender.customer}" добавлен в реализацию`, { type: 'success', duration: 4000 });
    } catch (err) {
      console.error('Error adding contract:', err);
      alert('Ошибка при добавлении контракта');
    }
  };

  const totalContractPrice = tenders.reduce((sum, t) => sum + (t.contract_price || 0), 0);
  const completedCount = tenders.filter((t) => 
    stages.find(s => s.id === t.stage_id)?.is_final
  ).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 className={styles.pageTitle}>
              Реализация (контракты)
            </h1>
            <p className={styles.pageDescription}>
              Управление постконтрактной работой и заявками
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <span style={{ fontSize: '1.25rem', marginRight: '0.25rem' }}>+</span>
            Добавить контракт
          </button>
        </div>

        {/* Статистика */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: '#fff',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #eceff3',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
              Всего контрактов
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
              {tenders.length}
            </div>
          </div>
          
          <div style={{
            background: '#fff',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #eceff3',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
              В работе
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
              {tenders.length - completedCount}
            </div>
          </div>
          
          <div style={{
            background: '#fff',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #eceff3',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
              Завершено
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
              {completedCount}
            </div>
          </div>
          
          <div style={{
            background: '#fff',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #eceff3',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
              Сумма контрактов
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
              {(totalContractPrice / 100).toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '0.5rem' }}>⚠️ Ошибка</div>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={loadTenders}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Попробовать снова
              </button>
            </div>
          </div>
        ) : tenders.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                Нет контрактов в реализации
              </h3>
              <p style={{ color: '#64748b' }}>
                Выигранные тендеры появятся здесь автоматически
              </p>
            </div>
          </div>
        ) : (
          <TenderKanban
            tendersByStage={tendersByStage}
            stages={stages}
            onStageChange={handleStageChange}
            allowBackwardMovement={allowBackwardMovement}
            hideControls={true}
          />
        )}
      </div>

      {/* Модалка добавления контракта */}
      {companyId && (
        <AddContractModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSelect={handleSelectTender}
          companyId={companyId}
        />
      )}
    </div>
  );
}
