'use client';

import { useState } from 'react';
import type { TenderFilters } from '@/lib/tenders/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

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
    <div className="bg-card rounded-xl border p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Поиск */}
        <div>
          <label htmlFor="search" className="text-sm font-medium mb-1 block">Поиск</label>
          <Input
            id="search"
            type="search"
            placeholder="Номер, предмет, заказчик..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Статус */}
        <div>
          <label htmlFor="status" className="text-sm font-medium mb-1 block">Статус</label>
          <select
            id="status"
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Все статусы</option>
            <option value="active">Активный</option>
            <option value="won">Выигран</option>
            <option value="lost">Проигран</option>
            <option value="archived">Архив</option>
          </select>
        </div>

        {/* Этап */}
        <div>
          <label htmlFor="stage" className="text-sm font-medium mb-1 block">Этап</label>
          <select
            id="stage"
            value={filters.stage_id || ''}
            onChange={(e) => updateFilter('stage_id', e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Все этапы</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>
        </div>

        {/* Тип */}
        <div>
          <label htmlFor="type" className="text-sm font-medium mb-1 block">Тип закупки</label>
          <select
            id="type"
            value={filters.type_id || ''}
            onChange={(e) => updateFilter('type_id', e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Все типы</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Шаблон этапов */}
        {templates.length > 0 && (
          <div>
            <label htmlFor="template" className="text-sm font-medium mb-1 block">📚 Шаблон этапов</label>
            <select
              id="template"
              value={filters.template_id || ''}
              onChange={(e) => updateFilter('template_id', e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">Все шаблоны</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.icon} {template.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Менеджер */}
        <div>
          <label htmlFor="manager" className="text-sm font-medium mb-1 block">Менеджер</label>
          <select
            id="manager"
            value={filters.manager_id || ''}
            onChange={(e) => updateFilter('manager_id', e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Все менеджеры</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.full_name}</option>
            ))}
          </select>
        </div>

        {/* Дата от */}
        <div>
          <label htmlFor="date_from" className="text-sm font-medium mb-1 block">Дедлайн от</label>
          <Input
            id="date_from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => updateFilter('date_from', e.target.value)}
          />
        </div>

        {/* Дата до */}
        <div>
          <label htmlFor="date_to" className="text-sm font-medium mb-1 block">Дедлайн до</label>
          <Input
            id="date_to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => updateFilter('date_to', e.target.value)}
          />
        </div>

        {/* Кнопка сброса */}
        <div className="flex items-end">
          {hasActiveFilters && (
            <Button variant="secondary" onClick={clearFilters} className="w-full">
              <X className="h-4 w-4 mr-1" /> Сбросить фильтры
            </Button>
          )}
        </div>
      </div>

      {/* Активные фильтры */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
              Поиск: {filters.search}
              <button onClick={() => updateFilter('search', undefined)} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
              Статус: {filters.status}
              <button onClick={() => updateFilter('status', undefined)} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.stage_id && (
            <span className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
              Этап
              <button onClick={() => updateFilter('stage_id', undefined)} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
