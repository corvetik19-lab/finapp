'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserCheck,
  Palmtree,
  Building2,
  Plus,
  Download,
  Mail,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from 'lucide-react';

interface EmployeeStats {
  total: number;
  by_status?: Record<string, number>;
  by_department?: Record<string, number>;
}

interface EmployeesHeaderProps {
  stats?: EmployeeStats;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: string) => void;
  onSortOrderToggle: () => void;
  onAddClick: () => void;
  onExportClick: () => void;
  onInviteClick: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function EmployeesHeader({
  stats,
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchChange,
  sortField,
  sortOrder,
  onSortChange,
  onSortOrderToggle,
  onAddClick,
  onExportClick,
  onInviteClick,
  showFilters,
  onToggleFilters,
}: EmployeesHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Сотрудники
          </h1>
          <p className="text-muted-foreground text-sm">
            Управление сотрудниками и их ролями
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExportClick}>
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
          <Button variant="outline" onClick={onInviteClick}>
            <Mail className="mr-2 h-4 w-4" />
            Пригласить
          </Button>
          <Button onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Всего</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_status?.active || 0}</p>
                <p className="text-sm text-muted-foreground">Активных</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Palmtree className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_status?.vacation || 0}</p>
                <p className="text-sm text-muted-foreground">В отпуске</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.keys(stats.by_department || {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Отделов</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Панель управления */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Переключатель вида */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            <List className="h-4 w-4 mr-1" />
            Таблица
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('cards')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Карточки
          </Button>
        </div>

        {/* Сортировка */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Сортировка:</span>
          <Select value={sortField} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">По дате добавления</SelectItem>
              <SelectItem value="full_name">По имени</SelectItem>
              <SelectItem value="hire_date">По дате найма</SelectItem>
              <SelectItem value="status">По статусу</SelectItem>
              <SelectItem value="tenders_count">По кол-ву тендеров</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onSortOrderToggle}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        {/* Поиск и фильтры */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск сотрудников..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={onToggleFilters}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Фильтры
          </Button>
        </div>
      </div>
    </div>
  );
}
