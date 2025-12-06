'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TenderFilters, TenderStage, TenderType } from '@/lib/tenders/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Поиск по названию, заказчику, номеру..."
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-10 pr-10"
          />
          {localFilters.search && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => handleChange('search', '')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
          <Filter className="h-4 w-4 mr-2" />
          Фильтры
          {hasActiveFilters && <Badge variant="secondary" className="ml-2">{Object.values(localFilters).filter(v => v).length}</Badge>}
          {isExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClear}>
            <X className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={localFilters.status || 'all'} onValueChange={(v) => handleChange('status', v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Все статусы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="won">Выигран</SelectItem>
                  <SelectItem value="lost">Проигран</SelectItem>
                  <SelectItem value="archived">Архив</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Этап</Label>
              <Select value={localFilters.stage_id || 'all'} onValueChange={(v) => handleChange('stage_id', v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Все этапы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все этапы</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={localFilters.type_id || 'all'} onValueChange={(v) => handleChange('type_id', v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Все типы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {employees.length > 0 && (
              <div className="space-y-2">
                <Label>Ответственный</Label>
                <Select value={localFilters.manager_id || 'all'} onValueChange={(v) => handleChange('manager_id', v === 'all' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Все сотрудники" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все сотрудники</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Дата от</Label>
              <Input type="date" value={localFilters.date_from || ''} onChange={(e) => handleChange('date_from', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Дата до</Label>
              <Input type="date" value={localFilters.date_to || ''} onChange={(e) => handleChange('date_to', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
