'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import { formatCurrency, daysUntilDeadline, getDeadlineUrgency } from '@/lib/tenders/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Trash2, Clock, Building, FileText, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface TendersKanbanProps {
  tenders: Tender[];
  stages: TenderStage[];
  types?: TenderType[];
  onDelete?: (id: string) => void;
  onStageChange?: (tenderId: string, newStageId: string) => Promise<void>;
}

export function TendersKanban({ tenders, stages, onDelete, onStageChange }: TendersKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !onStageChange) return;

    const tenderId = active.id as string;
    const newStageId = over.id as string;
    
    // Находим текущий этап тендера
    const tender = tenders.find(t => t.id === tenderId);
    if (!tender || tender.stage_id === newStageId) return;

    await onStageChange(tenderId, newStageId);
  };

  const activeTender = activeId ? tenders.find(t => t.id === activeId) : null;
  // Группируем тендеры по этапам
  const tendersByStage = useMemo(() => {
    const grouped = new Map<string, Tender[]>();
    
    // Инициализируем пустые массивы для каждого этапа
    stages.forEach(stage => {
      grouped.set(stage.id, []);
    });
    
    // Группируем тендеры
    tenders.forEach(tender => {
      const stageId = tender.stage_id;
      if (stageId && grouped.has(stageId)) {
        grouped.get(stageId)!.push(tender);
      }
    });
    
    return grouped;
  }, [tenders, stages]);

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

    return <Badge variant={variants[status]} className="text-xs">{labels[status]}</Badge>;
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex gap-4">
          {stages.map(stage => {
            const stageTenders = tendersByStage.get(stage.id) || [];
            
            return (
              <DroppableColumn key={stage.id} stage={stage} tenderCount={stageTenders.length}>
                {stageTenders.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Нет тендеров
                  </div>
                ) : (
                  stageTenders.map(tender => (
                    <DraggableTenderCard
                      key={tender.id}
                      tender={tender}
                      onDelete={onDelete}
                      getDeadlineBadge={getDeadlineBadge}
                      getStatusBadge={getStatusBadge}
                      isDragging={activeId === tender.id}
                    />
                  ))
                )}
              </DroppableColumn>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Overlay при перетаскивании */}
      <DragOverlay>
        {activeTender ? (
          <TenderCardContent
            tender={activeTender}
            getDeadlineBadge={getDeadlineBadge}
            getStatusBadge={getStatusBadge}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Droppable Column Component
function DroppableColumn({ 
  stage, 
  tenderCount, 
  children 
}: { 
  stage: TenderStage; 
  tenderCount: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex-shrink-0 w-80">
      {/* Column Header */}
      <div 
        className="rounded-t-lg px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: stage.color || '#e5e7eb' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-white drop-shadow">
            {stage.name}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {tenderCount}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div 
        ref={setNodeRef}
        className={`bg-muted/30 rounded-b-lg min-h-[400px] p-2 space-y-2 transition-colors ${
          isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// Draggable Tender Card
function DraggableTenderCard({
  tender,
  onDelete,
  getDeadlineBadge,
  getStatusBadge,
  isDragging,
}: {
  tender: Tender;
  onDelete?: (id: string) => void;
  getDeadlineBadge: (deadline: string) => React.ReactNode;
  getStatusBadge: (status: Tender['status']) => React.ReactNode;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: tender.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      <TenderCardContent
        tender={tender}
        onDelete={onDelete}
        getDeadlineBadge={getDeadlineBadge}
        getStatusBadge={getStatusBadge}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Tender Card Content (used for both regular and overlay)
function TenderCardContent({
  tender,
  onDelete,
  getDeadlineBadge,
  getStatusBadge,
  dragHandleProps,
  isDragging,
}: {
  tender: Tender;
  onDelete?: (id: string) => void;
  getDeadlineBadge: (deadline: string) => React.ReactNode;
  getStatusBadge: (status: Tender['status']) => React.ReactNode;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}) {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg rotate-2' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {dragHandleProps && (
              <div 
                {...dragHandleProps} 
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <Link 
              href={`/tenders/${tender.id}`}
              className="text-sm font-medium text-primary hover:underline line-clamp-2"
            >
              {tender.purchase_number || 'Без номера'}
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tenders/${tender.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Открыть
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(tender.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Subject */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {tender.subject}
        </p>

        {/* Customer */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building className="h-3 w-3" />
          <span className="truncate">{tender.customer}</span>
        </div>

        {/* NMCK */}
        <div className="text-sm font-medium">
          {formatCurrency(tender.nmck)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {tender.submission_deadline && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(tender.submission_deadline).toLocaleDateString('ru-RU')}
              </span>
              {getDeadlineBadge(tender.submission_deadline)}
            </div>
          )}
          {getStatusBadge(tender.status)}
        </div>
      </CardContent>
    </Card>
  );
}
