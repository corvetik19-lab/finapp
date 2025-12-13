"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Trash2, GripVertical, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanCardComponent } from "./KanbanCard";
import type { KanbanColumn, KanbanCard } from "@/lib/team/types";

interface KanbanColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  onAddCard: () => void;
  onDeleteColumn: () => void;
  onUpdateColumn: (data: Partial<KanbanColumn>) => void;
  onDeleteCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, data: Partial<KanbanCard>) => void;
}

export function KanbanColumnComponent({
  column,
  cards,
  onAddCard,
  onDeleteColumn,
  onUpdateColumn,
  onDeleteCard,
  onUpdateCard,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveName = () => {
    if (editName.trim() && editName !== column.name) {
      onUpdateColumn({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(column.name);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col w-72 min-w-[288px] bg-muted/50 rounded-lg"
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between p-3 rounded-t-lg"
        style={{ borderTop: `3px solid ${column.color || "#6366f1"}` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-muted rounded p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveName}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h3
              className="font-semibold text-sm cursor-pointer hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              {column.name}
            </h3>
          )}

          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {cards.length}
            {column.wip_limit && `/${column.wip_limit}`}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDeleteColumn}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCardComponent
              key={card.id}
              card={card}
              onDelete={() => onDeleteCard(card.id)}
              onUpdate={(data) => onUpdateCard(card.id, data)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Button */}
      <div className="p-2 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onAddCard}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить карточку
        </Button>
      </div>
    </div>
  );
}
