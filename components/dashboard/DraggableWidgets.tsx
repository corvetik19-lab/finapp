"use client";

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DashboardWidgetKey } from '@/lib/dashboard/preferences/shared';

interface DraggableWidgetsProps {
  children: React.ReactNode;
  widgetKeys: DashboardWidgetKey[];
  onOrderChange?: (newOrder: DashboardWidgetKey[]) => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/**
 * Компонент для Drag&Drop виджетов на дашборде
 * Использует @dnd-kit для перетаскивания
 */
export default function DraggableWidgets({
  children,
  widgetKeys,
  onOrderChange,
}: DraggableWidgetsProps) {
  const [items, setItems] = useState<DashboardWidgetKey[]>(widgetKeys);
  const [isDragMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для начала драга
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setItems(widgetKeys);
  }, [widgetKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as DashboardWidgetKey);
        const newIndex = items.indexOf(over.id as DashboardWidgetKey);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Сохраняем новый порядок
        if (onOrderChange) {
          onOrderChange(newOrder);
        }

        return newOrder;
      });
    }
  };

  // Если не в режиме драга, просто рендерим children как есть
  if (!isDragMode) {
    return <>{children}</>;
  }

  // В режиме драга оборачиваем в DndContext
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((key) => (
          <SortableItem key={key} id={key}>
            {/* Здесь будет виджет */}
            <div>{key}</div>
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
