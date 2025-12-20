'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import {
  formatCurrency,
  daysUntilDeadline,
  getDeadlineUrgency,
} from '@/lib/tenders/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Trash2, Users, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortColumn = 'nmck' | 'deadline' | 'created_at' | null;
type SortDirection = 'asc' | 'desc';

interface TendersTableProps {
  tenders: Tender[];
  stages?: TenderStage[];
  types?: TenderType[];
  onDelete?: (id: string) => void;
}

export function TendersTable({ tenders, onDelete }: TendersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedTenders = useMemo(() => {
    if (!sortColumn) return tenders;

    return [...tenders].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'nmck':
          comparison = (a.nmck || 0) - (b.nmck || 0);
          break;
        case 'deadline': {
          const dateA = a.submission_deadline ? new Date(a.submission_deadline).getTime() : 0;
          const dateB = b.submission_deadline ? new Date(b.submission_deadline).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tenders, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tenders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenders.map((t) => t.id)));
    }
  };

  const getStatusBadge = (status: Tender['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      won: 'secondary',
      lost: 'destructive',
      archived: 'outline',
    };

    const labels = {
      active: 'Активный',
      won: 'Выигран',
      lost: 'Проигран',
      archived: 'Архив',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getDeadlineBadge = (deadline: string) => {
    const urgency = getDeadlineUrgency(deadline);
    const days = daysUntilDeadline(deadline);

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      urgent: 'destructive',
      warning: 'secondary',
      normal: 'outline',
      passed: 'outline',
    };

    const labels = {
      urgent: `${days}д`,
      warning: `${days}д`,
      normal: `${days}д`,
      passed: 'Истек',
    };

    return <Badge variant={variants[urgency]} className="text-xs">{labels[urgency]}</Badge>;
  };

  if (tenders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">Нет тендеров</h3>
        <p className="text-sm">Добавьте первый тендер, чтобы начать работу</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === sortedTenders.length && sortedTenders.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Номер закупки</TableHead>
              <TableHead className="max-w-[200px]">Предмет</TableHead>
              <TableHead className="max-w-[200px]">Заказчик</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('nmck')}
              >
                <div className="flex items-center">
                  НМЦК
                  <SortIcon column="nmck" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('deadline')}
              >
                <div className="flex items-center">
                  Дедлайн
                  <SortIcon column="deadline" />
                </div>
              </TableHead>
              <TableHead>Этап</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Ответственные</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTenders.map((tender) => (
              <TableRow
                key={tender.id}
                className={selectedIds.has(tender.id) ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(tender.id)}
                    onCheckedChange={() => toggleSelect(tender.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/tenders/${tender.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {tender.purchase_number}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate text-sm">{tender.subject}</div>
                  {tender.project_name && (
                    <div className="truncate text-xs text-muted-foreground">{tender.project_name}</div>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate text-sm">{tender.customer}</div>
                  {tender.city && (
                    <div className="text-xs text-muted-foreground">{tender.city}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{formatCurrency(tender.nmck)}</div>
                  {tender.our_price && (
                    <div className="text-xs text-muted-foreground">
                      Наша: {formatCurrency(tender.our_price)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(tender.submission_deadline).toLocaleDateString('ru-RU')}
                  </div>
                  {getDeadlineBadge(tender.submission_deadline)}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{tender.stage?.name || '—'}</span>
                </TableCell>
                <TableCell>{getStatusBadge(tender.status)}</TableCell>
                <TableCell>
                  {tender.responsible && tender.responsible.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {tender.responsible.slice(0, 2).map((resp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {resp.employee.full_name.charAt(0)}
                          </div>
                          <span className="text-xs">{resp.employee.full_name}</span>
                        </div>
                      ))}
                      {tender.responsible.length > 2 && (
                        <span className="text-xs text-muted-foreground ml-8">
                          +{tender.responsible.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/tenders/${tender.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Открыть
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" />
                        Назначить
                      </DropdownMenuItem>
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(tender.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
          <Button variant="secondary" size="sm">Изменить этап</Button>
          <Button variant="secondary" size="sm">Назначить</Button>
          <Button variant="destructive" size="sm">Удалить</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Отменить
          </Button>
        </div>
      )}
    </div>
  );
}
