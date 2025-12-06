'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenderKanban } from '@/components/tenders/tender-kanban';
import { AddContractModal } from '@/components/tenders/AddContractModal';
import type { Tender, TenderStage } from '@/lib/tenders/types';
import { subscribeToStagesUpdates } from '@/lib/tenders/events';
import { useToast } from '@/components/toast/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, AlertCircle, Package } from 'lucide-react';

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
    <div className="h-full flex flex-col min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <Card className="mb-3 flex-shrink-0">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Реализация (контракты)</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Управление постконтрактной работой</p>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white p-2 md:p-3 rounded-lg border shadow-sm">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Всего</div>
              <div className="text-lg md:text-xl font-bold text-gray-900">{tenders.length}</div>
            </div>
            <div className="bg-white p-2 md:p-3 rounded-lg border shadow-sm">
              <div className="text-xs text-gray-500 font-medium mb-0.5">В работе</div>
              <div className="text-lg md:text-xl font-bold text-gray-900">{tenders.length - completedCount}</div>
            </div>
            <div className="bg-white p-2 md:p-3 rounded-lg border shadow-sm">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Завершено</div>
              <div className="text-lg md:text-xl font-bold text-gray-900">{completedCount}</div>
            </div>
            <div className="bg-white p-2 md:p-3 rounded-lg border shadow-sm">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Сумма</div>
              <div className="text-lg md:text-xl font-bold text-gray-900">{(totalContractPrice / 100).toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadTenders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Попробовать снова
            </Button>
          </div>
        ) : tenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет контрактов в реализации</h3>
            <p className="text-gray-500">Выигранные тендеры появятся здесь автоматически</p>
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
