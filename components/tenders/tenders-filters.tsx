'use client';

import { useState } from 'react';
import type { TenderFilters } from '@/lib/tenders/types';
import styles from '@/app/(protected)/tenders/tenders.module.css';

interface TendersFiltersProps {
  onFilterChange: (filters: TenderFilters) => void;
  stages?: Array<{ id: string; name: string }>;
  types?: Array<{ id: string; name: string }>;
  templates?: Array<{ id: string; name: string; icon?: string }>;
  managers?: Array<{ id: string; full_name: string }>;
}

export function TendersFilters({
  onFilterChange,
  stages = [],
  types = [],
  templates = [],
  managers = [],
}: TendersFiltersProps) {
  const [filters, setFilters] = useState<TenderFilters>({});

  const updateFilter = (key: keyof TenderFilters, value: string | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className={styles.card} style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Поиск */}
        <div className={styles.formGroup}>
          <label htmlFor="search">
            Поиск
          </label>
          <input
            id="search"
            type="search"
            placeholder="Номер, предмет, заказчик..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Статус */}
        <div className={styles.formGroup}>
          <label htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="active">Активный</option>
            <option value="won">Выигран</option>
            <option value="lost">Проигран</option>
            <option value="archived">Архив</option>
          </select>
        </div>

        {/* Этап */}
        <div className={styles.formGroup}>
          <label htmlFor="stage">
            Этап
          </label>
          <select
            id="stage"
            value={filters.stage_id || ''}
            onChange={(e) => updateFilter('stage_id', e.target.value)}
          >
            <option value="">Все этапы</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Тип */}
        <div className={styles.formGroup}>
          <label htmlFor="type">
            Тип закупки
          </label>
          <select
            id="type"
            value={filters.type_id || ''}
            onChange={(e) => updateFilter('type_id', e.target.value)}
          >
            <option value="">Все типы</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Шаблон этапов */}
        {templates.length > 0 && (
          <div className={styles.formGroup}>
            <label htmlFor="template">
              📚 Шаблон этапов
            </label>
            <select
              id="template"
              value={filters.template_id || ''}
              onChange={(e) => updateFilter('template_id', e.target.value)}
            >
              <option value="">Все шаблоны</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.icon} {template.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Менеджер */}
        <div className={styles.formGroup}>
          <label htmlFor="manager">
            Менеджер
          </label>
          <select
            id="manager"
            value={filters.manager_id || ''}
            onChange={(e) => updateFilter('manager_id', e.target.value)}
          >
            <option value="">Все менеджеры</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Дата от */}
        <div className={styles.formGroup}>
          <label htmlFor="date_from">
            Дедлайн от
          </label>
          <input
            id="date_from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => updateFilter('date_from', e.target.value)}
          />
        </div>

        {/* Дата до */}
        <div className={styles.formGroup}>
          <label htmlFor="date_to">
            Дедлайн до
          </label>
          <input
            id="date_to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => updateFilter('date_to', e.target.value)}
          />
        </div>

        {/* Кнопка сброса */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ width: '100%' }}
            >
              ✕ Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      {/* Активные фильтры */}
      {hasActiveFilters && (
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {filters.search && (
            <span className={styles.badgeInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Поиск: {filters.search}
              <button
                onClick={() => updateFilter('search', undefined)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </span>
          )}
          {filters.status && (
            <span className={styles.badgeInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Статус: {filters.status}
              <button
                onClick={() => updateFilter('status', undefined)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </span>
          )}
          {filters.stage_id && (
            <span className={styles.badgeInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Этап
              <button
                onClick={() => updateFilter('stage_id', undefined)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
