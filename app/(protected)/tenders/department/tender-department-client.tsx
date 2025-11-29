'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TenderKanban } from '@/components/tenders/tender-kanban';
import { TenderQuickFilters } from '@/components/tenders/tender-quick-filters';
import { TenderSearchEISModal } from '@/components/tenders/tender-search-eis-modal';
import { TenderFormModal } from '@/components/tenders/tender-form-modal';
import type { Tender, TenderStage, TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { loadStageTemplates } from '@/lib/tenders/template-service';
import { subscribeToStagesUpdates } from '@/lib/tenders/events';
import styles from '../tenders.module.css';

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
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; role?: string }>>([]);
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
        
        const roleNames: Record<string, string> = {
          admin: 'Администратор',
          manager: 'Менеджер',
          tender_specialist: 'Тендерный специалист',
          accountant: 'Бухгалтер',
          logistics: 'Логист',
          viewer: 'Наблюдатель',
        };
        
        setEmployees(employeesList.map((emp: { id: string; full_name?: string; first_name?: string; last_name?: string; email?: string; role?: string }) => ({
          id: emp.id,
          full_name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Без имени',
          role: emp.role ? roleNames[emp.role] || emp.role : undefined
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 className={styles.pageTitle}>
              Тендерный отдел (этапы 1-ой категории)
            </h1>
            <p className={styles.pageDescription}>
              Управление предконтрактной работой
            </p>
          </div>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <span className={styles.btnIcon}>+</span>
            Добавить тендер
          </button>
        </div>
      </div>

      {/* Быстрые фильтры */}
      <TenderQuickFilters
        managers={managers}
        onFilterChange={setFilters}
        stats={stats}
      />

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
