"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumnComponent } from "./KanbanColumn";
import { KanbanCardComponent } from "./KanbanCard";
import type { KanbanColumn, KanbanCard } from "@/lib/team/types";

interface KanbanBoardViewProps {
  columns: (KanbanColumn & { cards: KanbanCard[] })[];
  onMoveCard: (cardId: string, toColumnId: string, newPosition: number) => void;
  onReorderColumns: (columnId: string, newPosition: number) => void;
  onAddCard: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onUpdateColumn: (columnId: string, data: Partial<KanbanColumn>) => void;
  onDeleteCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, data: Partial<KanbanCard>) => void;
}

export function KanbanBoardView({
  columns,
  onMoveCard,
  onReorderColumns,
  onAddCard,
  onDeleteColumn,
  onUpdateColumn,
  onDeleteCard,
  onUpdateCard,
}: KanbanBoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"column" | "card" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumn = (id: string) => {
    // Check if it's a column
    const column = columns.find((c) => c.id === id);
    if (column) return column;

    // Check if it's a card
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return col;
    }
    return null;
  };

  const findCard = (id: string) => {
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return card;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    // Check if it's a column or card
    const isColumn = columns.some((c) => c.id === id);
    setActiveId(id);
    setActiveType(isColumn ? "column" : "card");
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveCard = !columns.some((c) => c.id === activeId);
    const isOverColumn = columns.some((c) => c.id === overId);

    if (!isActiveCard) return;

    // Find the containers
    const activeColumn = findColumn(activeId);
    const overColumn = isOverColumn ? columns.find((c) => c.id === overId) : findColumn(overId);

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    // Moving card to different column - handled in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveColumn = columns.some((c) => c.id === activeId);

    if (isActiveColumn) {
      // Reordering columns
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onReorderColumns(activeId, newIndex);
      }
    } else {
      // Moving cards
      const activeColumn = findColumn(activeId);
      const overColumn = columns.some((c) => c.id === overId) 
        ? columns.find((c) => c.id === overId)
        : findColumn(overId);

      if (!activeColumn || !overColumn) return;

      if (activeColumn.id === overColumn.id) {
        // Same column - reorder
        const oldIndex = activeColumn.cards.findIndex((c) => c.id === activeId);
        const newIndex = activeColumn.cards.findIndex((c) => c.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          onMoveCard(activeId, activeColumn.id, newIndex);
        }
      } else {
        // Different column - move
        const overIndex = overColumn.cards.findIndex((c) => c.id === overId);
        const newPosition = overIndex === -1 ? overColumn.cards.length : overIndex;
        onMoveCard(activeId, overColumn.id, newPosition);
      }
    }
  };

  const activeCard = activeId && activeType === "card" ? findCard(activeId) : null;
  const activeColumn = activeId && activeType === "column" ? columns.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full min-h-[500px]">
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              cards={column.cards}
              onAddCard={() => onAddCard(column.id)}
              onDeleteColumn={() => onDeleteColumn(column.id)}
              onUpdateColumn={(data) => onUpdateColumn(column.id, data)}
              onDeleteCard={onDeleteCard}
              onUpdateCard={onUpdateCard}
            />
          ))}
        </SortableContext>

        {columns.length === 0 && (
          <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
            Создайте первую колонку для начала работы
          </div>
        )}
      </div>

      <DragOverlay>
        {activeCard && (
          <KanbanCardComponent card={activeCard} isDragging />
        )}
        {activeColumn && (
          <div className="w-72 bg-muted rounded-lg p-3 opacity-80">
            <h3 className="font-semibold">{activeColumn.name}</h3>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
