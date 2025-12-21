'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { TenderKanban } from '@/components/tenders/tender-kanban';
import { TenderQuickFilters } from '@/components/tenders/tender-quick-filters';
import { TenderSearchEISModal } from '@/components/tenders/tender-search-eis-modal';
import { TenderFormModal } from '@/components/tenders/tender-form-modal';
import type { Tender, TenderStage, TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { loadStageTemplates } from '@/lib/tenders/template-service';
import { subscribeToStagesUpdates } from '@/lib/tenders/events';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Platform {
  id: string;
  name: string;
  short_name: string | null;
}

interface TenderDepartmentClientProps {
  stages: TenderStage[];
  types: TenderType[];
  companyId: string;
  platforms?: Platform[];
}

const ARCHIVED_STAGE_NAMES = [
  'Не участвуем',
  'Не прошло проверку',
  'Не подано',
  'Проиграли',
  'Договор не заключен',
];

const normalizeStageName = (name: string | null | undefined) => (name || '').trim().toLowerCase();

export function TenderDepartmentClient({ stages: initialStages, types, companyId, platforms = [] }: TenderDepartmentClientProps) {
  console.log('TenderDepartmentClient mounted with companyId:', companyId);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tendersByStage, setTendersByStage] = useState<Record<string, Tender[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    responsible_ids?: string[];
  }>({});
  const [allowBackwardMovement, setAllowBackwardMovement] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [eisData, setEisData] = useState<EISTenderData | null>(null);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; role?: string; role_color?: string }>>([]);
  const [templates, setTemplates] = useState<TenderStageTemplate[]>([]);
  const [stages, setStages] = useState<TenderStage[]>(initialStages);

  // Фильтруем тендеры только по этапам тендерного отдела
  const departmentTenders = useMemo(() => {
    const stageIds = new Set(stages.map(s => s.id));
    return tenders.filter(t => stageIds.has(t.stage_id));
  }, [tenders, stages]);

  // Фильтруем тендеры по ответственным (из тендеров тендерного отдела)
  const filteredTenders = useMemo(() => {
    return departmentTenders.filter(tender => {
      if (filters.responsible_ids && filters.responsible_ids.length > 0) {
        // Проверяем есть ли хотя бы один из выбранных ответственных в массиве responsible
        const hasResponsible = tender.responsible?.some(
          resp => filters.responsible_ids!.includes(resp.employee.id)
        );
        if (!hasResponsible) return false;
      }
      return true;
    });
  }, [departmentTenders, filters]);

  // Статистика
  const archivedStageSet = useMemo(
    () => new Set(ARCHIVED_STAGE_NAMES.map(name => normalizeStageName(name))),
    []
  );

  const stats = useMemo(() => {
    const relevantTenders = filteredTenders.filter((t) => {
      const stageName = normalizeStageName(t.stage?.name);
      return !archivedStageSet.has(stageName);
    });

    const totalCount = relevantTenders.length;
    const totalSum = relevantTenders.reduce((sum, t) => sum + t.nmck, 0);
    const totalProfit = relevantTenders.reduce((sum, t) => {
      if (t.contract_price && t.our_price) {
        return sum + (t.our_price - t.contract_price);
      }
      return sum;
    }, 0);
    return { totalCount, totalSum, totalProfit };
  }, [filteredTenders, archivedStageSet]);

  // Уникальные ответственные из тендеров тендерного отдела
  const managers = useMemo(() => {
    const uniqueResponsibles = new Map();
    departmentTenders.forEach(tender => {
      tender.responsible?.forEach(resp => {
        if (resp.employee) {
          uniqueResponsibles.set(resp.employee.id, {
            id: resp.employee.id,
            full_name: resp.employee.full_name
          });
        }
      });
    });
    return Array.from(uniqueResponsibles.values());
  }, [departmentTenders]);

  const loadTenders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: companyId,
        limit: '1000',
      });

      const response = await fetch(`/api/tenders?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки тендеров');
      }

      const data = await response.json();
      const allTenders = data || [];
      setTenders(allTenders);

      // Группируем по этапам тендерного отдела
      // Группировка будет происходить на основе отфильтрованных тендеров
    } catch (err) {
      console.error('Error loading tenders:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Загрузка шаблонов этапов
  const loadTemplates = useCallback(async () => {
    if (!companyId) return;
    const data = await loadStageTemplates(companyId);
    setTemplates(data);
  }, [companyId]);

  // Загрузка этапов тендерного отдела
  const loadStages = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenders/stages?company_id=${companyId}`);
      if (response.ok) {
        const result = await response.json();
        const allStages = result.data || [];
        
        // Включаем этапы тендерного отдела и архивные этапы
        const relevantStages = allStages.filter((s: TenderStage) => 
          s.category === 'tender_dept' || s.category === 'archive'
        );
        
        // Сортируем: архивные этапы сверху, затем обычные по order_index
        const sortedStages = relevantStages.sort((a: TenderStage, b: TenderStage) => {
          if (a.category === 'archive' && b.category !== 'archive') return -1;
          if (a.category !== 'archive' && b.category === 'archive') return 1;
          return (a.order_index || 0) - (b.order_index || 0);
        });
        
        setStages(sortedStages);
      }
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  }, [companyId]);

  // Загрузка сотрудников
  const loadEmployees = useCallback(async () => {
    try {
      const response = await fetch(`/api/employees?company_id=${companyId}&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const employeesList = Array.isArray(data) ? data : (data.employees || data.data || []);
        
        // Форматируем для селекта: id, full_name и role из role_data
        setEmployees(employeesList.map((emp: { 
          id: string; 
          full_name?: string; 
          first_name?: string; 
          last_name?: string; 
          email?: string; 
          position?: string;
          role?: string;
          role_data?: { name?: string; color?: string } | null;
        }) => ({
          id: emp.id,
          full_name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Без имени',
          // Приоритет: role_data.name > position > старое поле role
          role: emp.role_data?.name || emp.position || undefined,
          role_color: emp.role_data?.color || undefined
        })));
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  }, [companyId]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/tenders/settings/notifications');
      if (response.ok) {
        const result = await response.json();
        setAllowBackwardMovement(result.data?.allow_backward_movement || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Первая загрузка данных
  useEffect(() => {
    loadTenders();
    loadEmployees();
    loadSettings();
    loadTemplates();
    loadStages();
  }, [loadStages, loadTenders, loadEmployees, loadSettings, loadTemplates]);

  // Подписка на обновления этапов
  useEffect(() => {
    const unsubscribe = subscribeToStagesUpdates(() => {
      console.log('Stages updated, reloading...');
      loadStages();
    });

    return unsubscribe;
  }, [loadStages]);

  // Realtime подписка на изменения тендеров
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    const channel = supabase.channel(`department_tenders_${companyId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tenders', filter: `company_id=eq.${companyId}` },
        () => {
          loadTenders();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tender_responsible' },
        () => {
          loadTenders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadTenders]);

  // Перегруппировка при изменении фильтров
  useEffect(() => {
    const grouped: Record<string, Tender[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = filteredTenders.filter(
        (t: Tender) => t.stage_id === stage.id
      );
    });
    setTendersByStage(grouped);
  }, [filteredTenders, stages]);

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

      // Обновляем локальное состояние без перезагрузки
      const updatedData = await response.json();
      setTenders(prevTenders => 
        prevTenders.map(t => t.id === tenderId ? { ...t, stage_id: newStageId, stage: updatedData.stage } : t)
      );
    } catch (err) {
      console.error('Error changing stage:', err);
      alert('Ошибка при изменении этапа');
      throw err; // Пробрасываем ошибку для отката оптимистичного обновления
    }
  };

  return (
    <div className="h-full flex flex-col min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <Card className="mb-3 flex-shrink-0 overflow-hidden">
        <CardContent className="p-3 md:p-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Тендерный отдел</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Управление предконтрактной работой</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button size="sm" onClick={() => setIsSearchModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Добавить</span>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/tenders/settings"><Settings className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Быстрые фильтры */}
      <TenderQuickFilters
        managers={managers}
        onFilterChange={setFilters}
        stats={stats}
      />

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
        ) : (
          <TenderKanban
            tendersByStage={tendersByStage}
            stages={stages}
            templates={templates}
            onStageChange={handleStageChange}
            allowBackwardMovement={allowBackwardMovement}
            archivedStageNames={ARCHIVED_STAGE_NAMES}
          />
        )}
      </div>

      {/* Модалка поиска в ЕИС */}
      <TenderSearchEISModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onTenderFound={(data) => {
          setEisData(data);
          setIsFormModalOpen(true);
        }}
        onManualAdd={() => {
          setEisData(null);
          setIsSearchModalOpen(false);
          setIsFormModalOpen(true);
        }}
        companyId={companyId}
      />

      {/* Модалка создания тендера */}
      <TenderFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEisData(null);
        }}
        onSuccess={() => {
          setIsFormModalOpen(false);
          setEisData(null);
          loadTenders(); // Перезагружаем список
        }}
        companyId={companyId}
        types={types}
        templates={templates}
        managers={employees}
        platforms={platforms}
        eisData={eisData}
      />
    </div>
  );
}
