'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X, Filter, Users, DollarSign, TrendingUp } from 'lucide-react';

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

  const filteredManagers = managers.filter(manager =>
    manager.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  return (
    <Card className="flex-shrink-0 mb-3 overflow-hidden">
      <CardContent className="p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Быстрые фильтры
          </h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 justify-between min-w-0">
          {/* Фильтр по ответственным */}
          <div className="space-y-2 min-w-0 flex-shrink-0">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ответственные
            </Label>
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full md:w-64 justify-between"
              >
                {responsibleIds.length === 0 ? (
                  'Все ответственные'
                ) : (
                  <span className="flex items-center gap-2">
                    Выбрано: <Badge variant="secondary">{responsibleIds.length}</Badge>
                  </span>
                )}
                {isDropdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
                  <div className="p-2 border-b">
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск ответственных..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2">
                    {managers.length === 0 ? (
                      <div className="text-center text-gray-500 py-2">Нет ответственных</div>
                    ) : filteredManagers.length === 0 ? (
                      <div className="text-center text-gray-500 py-2">Ничего не найдено</div>
                    ) : (
                      filteredManagers.map((manager) => (
                        <label key={manager.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <Checkbox
                            checked={responsibleIds.includes(manager.id)}
                            onCheckedChange={() => handleResponsibleToggle(manager.id)}
                          />
                          <span className="text-sm">{manager.full_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Статистика */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 min-w-0">
            <div className="text-center min-w-[60px]">
              <div className="text-xs md:text-sm text-gray-500">Тендеров</div>
              <div className="text-lg md:text-xl font-bold">{stats.totalCount}</div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-xs md:text-sm text-gray-500 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                На сумму
              </div>
              <div className="text-lg md:text-xl font-bold text-blue-600">
                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(stats.totalSum / 100)}
              </div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-xs md:text-sm text-gray-500 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Прибыль
              </div>
              <div className="text-lg md:text-xl font-bold text-green-600">
                {stats.totalProfit !== null
                  ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(stats.totalProfit / 100)
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
