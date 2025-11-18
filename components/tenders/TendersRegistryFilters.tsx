'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TenderFilters, TenderStage, TenderType } from '@/lib/tenders/types';
import styles from './TendersRegistryFilters.module.css';

interface TendersRegistryFiltersProps {
  filters: TenderFilters;
  onFiltersChange: (updater: TenderFilters | ((prev: TenderFilters) => TenderFilters)) => void;
  stages: TenderStage[];
  types: TenderType[];
  employees?: Array<{ id: string; full_name: string }>;
}

export function TendersRegistryFilters({
  filters,
  onFiltersChange,
  stages,
  types,
  employees = []
}: TendersRegistryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<TenderFilters>(filters);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFirstRenderRef = useRef(true);

  // Синхронизируем локальные фильтры с внешними только при первом рендере
  useEffect(() => {
    if (isFirstRenderRef.current) {
      setLocalFilters(filters);
      isFirstRenderRef.current = false;
    }
  }, [filters]);

  // Отправляем изменения с debounce
  useEffect(() => {
    if (isFirstRenderRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onFiltersChange(localFilters);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localFilters, onFiltersChange]);

  const handleChange = useCallback((key: keyof TenderFilters, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  const handleClear = useCallback(() => {
    setLocalFilters({});
  }, []);

  const hasActiveFilters = Object.values(localFilters).some(v => v !== undefined && v !== '');

  return (
    <div className={styles.filters}>
      {/* Quick Filters */}
      <div className={styles.quickFilters}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск по названию, заказчику, номеру..."
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className={styles.searchInput}
          />
          {localFilters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className={styles.clearSearchButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.filterToggle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Фильтры
          {hasActiveFilters && <span className={styles.filterBadge}>{Object.values(localFilters).filter(v => v).length}</span>}
        </button>

        {hasActiveFilters && (
          <button onClick={handleClear} className={styles.clearButton}>
            Сбросить
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className={styles.expandedFilters}>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.label}>Статус</label>
              <select
                value={localFilters.status || ''}
                onChange={(e) => handleChange('status', e.target.value)}
                className={styles.select}
              >
                <option value="">Все статусы</option>
                <option value="active">Активный</option>
                <option value="won">Выигран</option>
                <option value="lost">Проигран</option>
                <option value="archived">Архив</option>
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.label}>Этап</label>
              <select
                value={localFilters.stage_id || ''}
                onChange={(e) => handleChange('stage_id', e.target.value)}
                className={styles.select}
              >
                <option value="">Все этапы</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.label}>Тип</label>
              <select
                value={localFilters.type_id || ''}
                onChange={(e) => handleChange('type_id', e.target.value)}
                className={styles.select}
              >
                <option value="">Все типы</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {employees.length > 0 && (
              <div className={styles.filterField}>
                <label className={styles.label}>Ответственный</label>
                <select
                  value={localFilters.manager_id || ''}
                  onChange={(e) => handleChange('manager_id', e.target.value)}
                  className={styles.select}
                >
                  <option value="">Все сотрудники</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.filterField}>
              <label className={styles.label}>Дата от</label>
              <input
                type="date"
                value={localFilters.date_from || ''}
                onChange={(e) => handleChange('date_from', e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.filterField}>
              <label className={styles.label}>Дата до</label>
              <input
                type="date"
                value={localFilters.date_to || ''}
                onChange={(e) => handleChange('date_to', e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
