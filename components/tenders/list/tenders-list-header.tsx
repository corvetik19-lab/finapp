'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Download,
  Upload,
  Filter,
  LayoutGrid,
  Table,
  Search,
  ChevronDown,
} from 'lucide-react';

interface TendersListHeaderProps {
  viewMode: 'table' | 'kanban';
  onViewModeChange: (mode: 'table' | 'kanban') => void;
  onAddClick: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  stats: {
    total: number;
    active: number;
    won: number;
    lost: number;
  };
}

export function TendersListHeader({
  viewMode,
  onViewModeChange,
  onAddClick,
  searchValue,
  onSearchChange,
  onFilterClick,
  stats,
}: TendersListHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onAddClick} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Добавить тендер
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Импорт
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Импорт из ЕИС</DropdownMenuItem>
              <DropdownMenuItem>Импорт из CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            <Table className="mr-2 h-4 w-4" />
            Таблица
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('kanban')}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Карточки
          </Button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, заказчику, номеру..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={onFilterClick}>
          <Filter className="mr-2 h-4 w-4" />
          Фильтры
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Всего</span>
          <Badge variant="secondary">{stats.total}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Активные</span>
          <Badge variant="default">{stats.active}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Выиграно</span>
          <Badge variant="outline" className="border-green-500 text-green-600">{stats.won}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Проиграно</span>
          <Badge variant="outline" className="border-destructive text-destructive">{stats.lost}</Badge>
        </div>
      </div>
    </div>
  );
}
