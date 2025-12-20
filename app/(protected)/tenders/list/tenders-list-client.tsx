'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TendersTable } from '@/components/tenders/tenders-table';
import { TendersKanban } from '@/components/tenders/tenders-kanban';
import { TendersRegistryFilters } from '@/components/tenders/TendersRegistryFilters';
import { TenderFormModal } from '@/components/tenders/tender-form-modal';
import { TenderSearchEISModal } from '@/components/tenders/tender-search-eis-modal';
import { TendersListHeader } from '@/components/tenders/list/tenders-list-header';
import type { Tender, TenderStage, TenderType, TenderFilters } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface TendersListClientProps {
  stages: TenderStage[];
  types: TenderType[];
  companyId: string;
}

export function TendersListClient({ stages, types, companyId }: TendersListClientProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TenderFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    // Загружаем сохраненный режим из localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tendersViewMode');
      return (saved === 'kanban' || saved === 'table') ? saved : 'table';
    }
    return 'table';
  });
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [eisData, setEisData] = useState<EISTenderData | null>(null);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; role?: string; role_color?: string }>>([]);

  // Стабилизируем stages чтобы избежать бесконечного цикла
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableStages = useMemo(() => stages, [stages.length]);

  const loadTenders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        company_id: companyId,
        page: page.toString(),
        limit: '50',
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.stage_id && { stage_id: filters.stage_id }),
        ...(filters.type_id && { type_id: filters.type_id }),
        ...(filters.manager_id && { manager_id: filters.manager_id }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      const response = await fetch(`/api/tenders?${params}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки тендеров');
      }

      const data = await response.json();
      setTenders(data || []);
      setTotal(data.length || 0);
    } catch (err) {
      console.error('Error loading tenders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      // Не показываем ошибку foreign key как критичную - это может быть проблема с данными
      if (!errorMessage.includes('foreign key constraint')) {
        alert(`Ошибка загрузки тендеров: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [
    companyId, 
    page, 
    filters.search,
    filters.status,
    filters.stage_id,
    filters.type_id,
    filters.manager_id,
    filters.date_from,
    filters.date_to
  ]);

  // Загрузка сотрудников
  const loadEmployees = useCallback(async () => {
    try {
      // Загружаем сотрудников для фильтра
      const response = await fetch(`/api/employees?company_id=${companyId}`);
      if (response.ok) {
        const employeesList = await response.json();
        
        // Форматируем для селекта: id, full_name и role из role_data
        setEmployees(employeesList.map((emp: { 
          id: string; 
          full_name?: string; 
          first_name?: string; 
          last_name?: string; 
          email?: string; 
          role_data?: { name?: string; color?: string } | null;
        }) => ({
          id: emp.id,
          full_name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Без имени',
          role: emp.role_data?.name || undefined,
          role_color: emp.role_data?.color || undefined
        })));
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  }, [companyId]);

  useEffect(() => {
    loadTenders();
    loadEmployees();
  }, [loadTenders, loadEmployees]);

  // Realtime подписка на изменения тендеров
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    const channel = supabase.channel(`tenders_list_${companyId}`)
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

  // Сохраняем выбранный режим просмотра в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tendersViewMode', viewMode);
    }
  }, [viewMode]);

  const handleFiltersChange = useCallback((updater: TenderFilters | ((prev: TenderFilters) => TenderFilters)) => {
    if (typeof updater === 'function') {
      setFilters(updater);
    } else {
      setFilters(updater);
    }
    setPage(1); // Сбрасываем на первую страницу при изменении фильтров
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тендер?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenders/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления тендера');
      }

      // Перезагружаем список
      await loadTenders();
    } catch (err) {
      console.error('Error deleting tender:', err);
      alert('Ошибка при удалении тендера');
    }
  };

  const handleStageChange = async (tenderId: string, newStageId: string) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: newStageId }),
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления этапа');
      }

      // Перезагружаем список
      await loadTenders();
    } catch (err) {
      console.error('Error changing stage:', err);
      alert('Ошибка при изменении этапа');
    }
  };

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header с действиями */}
      <TendersListHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddClick={() => setIsSearchModalOpen(true)}
        searchValue={filters.search || ''}
        onSearchChange={(value) => handleFiltersChange({ ...filters, search: value })}
        onFilterClick={() => setShowFilters(!showFilters)}
        stats={{
          total,
          active: tenders.filter((t) => t.status === 'active').length,
          won: tenders.filter((t) => t.status === 'won').length,
          lost: tenders.filter((t) => t.status === 'lost').length,
        }}
      />

      {/* Фильтры (разворачиваемые) */}
      {showFilters && (
        <TendersRegistryFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          stages={stableStages}
          types={types}
          employees={employees}
        />
      )}

      {/* Контент */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadTenders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <TendersTable
          tenders={tenders}
          stages={stableStages}
          types={types}
          onDelete={handleDelete}
        />
      ) : (
        <TendersKanban
          tenders={tenders}
          stages={stableStages}
          types={types}
          onDelete={handleDelete}
          onStageChange={handleStageChange}
        />
      )}

      {/* Пагинация */}
      {total > 50 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Показано {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} из {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 50 >= total}
            >
              Вперед →
            </Button>
          </div>
        </div>
      )}

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
        managers={employees}
        eisData={eisData}
      />
    </div>
  );
}
