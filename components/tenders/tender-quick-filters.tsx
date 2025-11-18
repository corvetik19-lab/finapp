'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './tender-quick-filters.module.css';

interface Manager {
  id: string;
  full_name: string;
}

interface TenderQuickFiltersProps {
  managers?: Manager[];
  onFilterChange: (filters: {
    responsible_ids?: string[];
  }) => void;
  stats: {
    totalCount: number;
    totalSum: number;
    totalProfit: number;
  };
}

export function TenderQuickFilters({
  managers = [],
  onFilterChange,
  stats,
}: TenderQuickFiltersProps) {
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleResponsibleToggle = (id: string) => {
    const newIds = responsibleIds.includes(id)
      ? responsibleIds.filter(rid => rid !== id)
      : [...responsibleIds, id];
    
    setResponsibleIds(newIds);
    onFilterChange({
      responsible_ids: newIds.length > 0 ? newIds : undefined,
    });
  };

  const handleReset = () => {
    setResponsibleIds([]);
    setIsDropdownOpen(false);
    setSearchQuery('');
    onFilterChange({});
  };

  const hasActiveFilters = responsibleIds.length > 0;

  // Фильтруем менеджеров по поисковому запросу
  const filteredManagers = managers.filter(manager =>
    manager.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Фокусируемся на поле поиска при открытии dropdown
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  return (
    <div className={styles.quickFilters}>
      <div className={styles.filtersHeader}>
        <h3 className={styles.filtersTitle}>Быстрые фильтры</h3>
        {hasActiveFilters && (
          <button onClick={handleReset} className={styles.resetButton}>
            Сбросить
          </button>
        )}
      </div>

      <div className={styles.filtersRow}>
        {/* Фильтры */}
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label>Ответственные</label>
            <div className={styles.multiSelectContainer} ref={dropdownRef}>
              <button
                type="button"
                className={styles.multiSelectButton}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {responsibleIds.length === 0 ? (
                  'Все ответственные'
                ) : (
                  `Выбрано: ${responsibleIds.length}`
                )}
                <span className={styles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</span>
              </button>
              
              {isDropdownOpen && (
                <div className={styles.multiSelectDropdown}>
                  {/* Поле поиска */}
                  <div className={styles.searchContainer}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск ответственных..."
                      className={styles.searchInput}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Список ответственных */}
                  <div className={styles.optionsList}>
                    {managers.length === 0 ? (
                      <div className={styles.emptyMessage}>Нет ответственных</div>
                    ) : filteredManagers.length === 0 ? (
                      <div className={styles.emptyMessage}>Ничего не найдено</div>
                    ) : (
                      filteredManagers.map((manager) => (
                        <label key={manager.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={responsibleIds.includes(manager.id)}
                            onChange={() => handleResponsibleToggle(manager.id)}
                            className={styles.checkbox}
                          />
                          <span>{manager.full_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Тендеров всего:</span>
            <strong className={styles.statValue}>{stats.totalCount}</strong>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>На сумму:</span>
            <strong className={styles.statValue}>
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
              }).format(stats.totalSum / 100)}
            </strong>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Чистая прибыль:</span>
            <strong className={styles.statValue}>
              {stats.totalProfit !== null
                ? new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  }).format(stats.totalProfit / 100)
                : '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
