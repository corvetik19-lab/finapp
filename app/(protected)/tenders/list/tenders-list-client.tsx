'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TendersRegistry } from '@/components/tenders/TendersRegistry';
import { TendersCards } from '@/components/tenders/TendersCards';
import { TendersRegistryFilters } from '@/components/tenders/TendersRegistryFilters';
import { TenderFormModal } from '@/components/tenders/tender-form-modal';
import { TenderSearchEISModal } from '@/components/tenders/tender-search-eis-modal';
import type { Tender, TenderStage, TenderType, TenderFilters } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import styles from '../tenders.module.css';

interface TendersListClientProps {
  stages: TenderStage[];
  types: TenderType[];
}

export function TendersListClient({ stages, types }: TendersListClientProps) {
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
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; role?: string }>>([]);

  // TODO: Получить company_id из контекста пользователя
  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

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
        
        // Маппинг ролей на русский язык
        const roleNames: Record<string, string> = {
          admin: 'Администратор',
          manager: 'Менеджер',
          tender_specialist: 'Тендерный специалист',
          accountant: 'Бухгалтер',
          logistics: 'Логист',
          viewer: 'Наблюдатель',
        };
        
        // Форматируем для селекта: id, full_name и role
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

  useEffect(() => {
    loadTenders();
    loadEmployees();
  }, [loadTenders, loadEmployees]);

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

  return (
    <div>
      {/* Действия и переключатель вида */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div className={styles.btnGroup}>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            ➕ Добавить тендер
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            📥 Импорт из ЕИС
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            📤 Экспорт
          </button>
        </div>

        <div className={styles.btnGroup}>
          <button
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
          >
            📋 Таблица
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={viewMode === 'kanban' ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
          >
            🗂️ Карточки
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <TendersRegistryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        stages={stableStages}
        types={types}
        employees={employees}
      />

      {/* Статистика */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Всего</span>
          <span className={styles.statValue}>{total}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Активные</span>
          <span className={styles.statValue}>
            {tenders.filter((t) => t.status === 'active').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Выиграно</span>
          <span className={styles.statValue}>
            {tenders.filter((t) => t.status === 'won').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Проиграно</span>
          <span className={styles.statValue}>
            {tenders.filter((t) => t.status === 'lost').length}
          </span>
        </div>
      </div>

      {/* Контент */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '0.5rem' }}>⚠️ Ошибка</div>
          <p style={{ color: '#64748b' }}>{error}</p>
          <button
            onClick={loadTenders}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ marginTop: '1rem' }}
          >
            Попробовать снова
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <TendersRegistry
          tenders={tenders}
          stages={stableStages}
          types={types}
          onDelete={handleDelete}
        />
      ) : (
        <TendersCards
          tenders={tenders}
          stages={stableStages}
          types={types}
          onDelete={handleDelete}
        />
      )}

      {/* Пагинация */}
      {total > 50 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Показано {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} из{' '}
            {total}
          </div>
          <div className={styles.btnGroup}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Назад
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 50 >= total}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ opacity: page * 50 >= total ? 0.5 : 1, cursor: page * 50 >= total ? 'not-allowed' : 'pointer' }}
            >
              Вперед →
            </button>
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
