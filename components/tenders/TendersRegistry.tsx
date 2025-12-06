'use client';

import { useState, useRef } from 'react';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import { formatCurrency, daysUntilDeadline } from '@/lib/tenders/types';
import { TenderViewModal } from './TenderViewModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Trash2, ChevronUp, ChevronDown, FileText, AlertTriangle, Trophy, ListTodo, X } from 'lucide-react';

interface TendersRegistryProps {
  tenders: Tender[];
  stages: TenderStage[];
  types?: TenderType[];
  onDelete?: (id: string) => void;
}

export function TendersRegistry({ tenders, stages, types = [], onDelete }: TendersRegistryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'nmck' | 'deadline'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewTenderId, setViewTenderId] = useState<string | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging only if clicked on header
    if (!(e.target as HTMLElement).closest('thead')) return;
    
    isDragging.current = true;
    if (tableWrapperRef.current) {
        startX.current = e.pageX - tableWrapperRef.current.offsetLeft;
        scrollLeft.current = tableWrapperRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    if (tableWrapperRef.current) {
        const x = e.pageX - tableWrapperRef.current.offsetLeft;
        const walk = (x - startX.current) * 1; // scroll-fast
        tableWrapperRef.current.scrollLeft = scrollLeft.current - walk;
    }
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

  const handleSort = (column: 'date' | 'nmck' | 'deadline') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const getStageName = (tender: Tender) => {
    // Сначала пробуем получить из вложенного объекта
    if (tender.stage && typeof tender.stage === 'object' && 'name' in tender.stage) {
      return tender.stage.name;
    }
    // Fallback на поиск по stage_id
    const stage = stages.find(s => s.id === tender.stage_id);
    return stage?.name || '-';
  };

  const getTypeName = (tender: Tender) => {
    // Сначала пробуем получить из вложенного объекта
    if (tender.type && typeof tender.type === 'object' && 'name' in tender.type) {
      return tender.type.name;
    }
    // Fallback на поиск по type_id
    if (!tender.type_id) return '-';
    const type = types.find(t => t.id === tender.type_id);
    return type?.name || '-';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getStatusLabel = (status: Tender['status']) => {
    const labels = {
      active: 'Активный',
      won: 'Выигран',
      lost: 'Проигран',
      archived: 'Архив',
    };
    return labels[status];
  };

  // Разделяем тендеры на три группы: просроченные, выигранные и активные
  const overdueTenders: Tender[] = [];
  const wonTenders: Tender[] = [];
  const activeTenders: Tender[] = [];

  tenders.forEach(tender => {
    if (tender.status === 'won') {
      wonTenders.push(tender);
    } else {
      const daysLeft = tender.submission_deadline ? daysUntilDeadline(tender.submission_deadline) : null;
      const isOverdue = daysLeft !== null && daysLeft < 0;
      
      if (isOverdue) {
        overdueTenders.push(tender);
      } else {
        activeTenders.push(tender);
      }
    }
  });

  // Сортируем каждую группу
  const sortTenders = (tendersToSort: Tender[]) => {
    return [...tendersToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'nmck':
          comparison = a.nmck - b.nmck;
          break;
        case 'deadline':
          if (!a.submission_deadline && !b.submission_deadline) return 0;
          if (!a.submission_deadline) return 1;
          if (!b.submission_deadline) return -1;
          comparison = new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedOverdueTenders = sortTenders(overdueTenders);
  const sortedWonTenders = sortTenders(wonTenders);
  const sortedActiveTenders = sortTenders(activeTenders);

  // Функция рендера строки тендера
  const renderTenderRow = (tender: Tender, index: number) => {
    const daysLeft = tender.submission_deadline ? daysUntilDeadline(tender.submission_deadline) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;
    const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
    const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

    return (
      <TableRow key={tender.id} className={selectedIds.has(tender.id) ? 'bg-blue-50' : ''}>
        <TableCell className="w-10">
          <Checkbox checked={selectedIds.has(tender.id)} onCheckedChange={() => toggleSelect(tender.id)} />
        </TableCell>
        <TableCell className="w-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTenderId(tender.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        </TableCell>
        <TableCell className="text-gray-500">{index + 1}</TableCell>
        <TableCell className="max-w-40 truncate">{tender.customer}</TableCell>
        <TableCell className="max-w-60 truncate font-medium">{tender.subject}</TableCell>
        <TableCell className="text-blue-600 font-medium">{formatCurrency(tender.nmck / 100)}</TableCell>
        <TableCell>
          {tender.submission_deadline && tender.status !== 'won' ? (
            <div className="space-y-1">
              <div className="text-sm">{formatDate(tender.submission_deadline)}</div>
              {isOverdue ? (
                <Badge variant="destructive" className="text-xs">Срок прошел</Badge>
              ) : daysLeft !== null && daysLeft >= 0 && (
                <Badge variant="outline" className={`text-xs ${isUrgent ? 'bg-red-100 text-red-700' : isWarning ? 'bg-yellow-100 text-yellow-700' : ''}`}>
                  {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                </Badge>
              )}
            </div>
          ) : '-'}
        </TableCell>
        <TableCell>{getTypeName(tender)}</TableCell>
        <TableCell>{getStageName(tender)}</TableCell>
        <TableCell>{isOverdue ? 'Просрочен' : getStatusLabel(tender.status)}</TableCell>
        <TableCell>
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(tender.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  if (tenders.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Нет тендеров</h3>
        <p className="text-gray-500">Добавьте первый тендер для начала работы</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center gap-4">
            <span className="text-sm text-gray-600">Выбрано: {selectedIds.size} из {tenders.length}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4 mr-1" />
              Отменить выбор
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div ref={tableWrapperRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === tenders.length && tenders.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>№</TableHead>
                  <TableHead>Заказчик</TableHead>
                  <TableHead>Предмет</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('nmck')}>
                    <div className="flex items-center gap-1">НМЦК {sortBy === 'nmck' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('deadline')}>
                    <div className="flex items-center gap-1">Дедлайн {sortBy === 'deadline' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}</div>
                  </TableHead>
                  <TableHead>Тип закупки</TableHead>
                  <TableHead>Этап</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOverdueTenders.length > 0 && (
                  <>
                    <TableRow className="bg-red-50 hover:bg-red-50">
                      <TableCell colSpan={11} className="py-2">
                        <div className="flex items-center gap-2 font-medium text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Просроченные</span>
                          <Badge variant="destructive">{sortedOverdueTenders.length}</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    {sortedOverdueTenders.map(renderTenderRow)}
                  </>
                )}
                {sortedWonTenders.length > 0 && (
                  <>
                    <TableRow className="bg-green-50 hover:bg-green-50">
                      <TableCell colSpan={11} className="py-2">
                        <div className="flex items-center gap-2 font-medium text-green-700">
                          <Trophy className="h-4 w-4" />
                          <span>Выигранные</span>
                          <Badge className="bg-green-600">{sortedWonTenders.length}</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    {sortedWonTenders.map(renderTenderRow)}
                  </>
                )}
                {sortedActiveTenders.length > 0 && (
                  <>
                    {(sortedOverdueTenders.length > 0 || sortedWonTenders.length > 0) && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell colSpan={11} className="py-2">
                          <div className="flex items-center gap-2 font-medium text-gray-700">
                            <ListTodo className="h-4 w-4" />
                            <span>Активные</span>
                            <Badge variant="secondary">{sortedActiveTenders.length}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {sortedActiveTenders.map(renderTenderRow)}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewTenderId && <TenderViewModal tenderId={viewTenderId} onClose={() => setViewTenderId(null)} />}
    </div>
  );
}
