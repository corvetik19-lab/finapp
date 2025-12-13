"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit2,
  User,
  AlertCircle,
  CheckSquare,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KanbanCard, CardPriority } from "@/lib/team/types";

interface KanbanCardProps {
  card: KanbanCard;
  isDragging?: boolean;
  onDelete?: () => void;
  onUpdate?: (data: Partial<KanbanCard>) => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const priorityLabels: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export function KanbanCardComponent({
  card,
  isDragging,
  onDelete,
  onUpdate,
}: KanbanCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    title: card.title,
    description: card.description || "",
    priority: card.priority || "normal",
    due_date: card.due_date || "",
    estimated_hours: card.estimated_hours || "",
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        title: editData.title,
        description: editData.description || null,
        priority: editData.priority as "low" | "normal" | "high" | "urgent",
        due_date: editData.due_date || null,
        estimated_hours: editData.estimated_hours ? Number(editData.estimated_hours) : null,
      });
    }
    setShowEditDialog(false);
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const checklistProgress = card.checklist && Array.isArray(card.checklist)
    ? {
        total: card.checklist.length,
        done: card.checklist.filter((item) => item.completed).length,
      }
    : null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          bg-background rounded-lg p-3 shadow-sm border cursor-grab
          hover:shadow-md transition-shadow
          ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}
        `}
      >
        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label, idx) => (
              <span
                key={idx}
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: label }}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <h4 className="font-medium text-sm mb-1">{card.title}</h4>

        {/* Description preview */}
        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {card.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {/* Priority */}
          {card.priority && card.priority !== "normal" && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${priorityColors[card.priority]}`}>
              {priorityLabels[card.priority]}
            </span>
          )}

          {/* Due date */}
          {card.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
              <Calendar className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })}
              {isOverdue && <AlertCircle className="h-3 w-3" />}
            </span>
          )}

          {/* Estimated hours */}
          {card.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {card.estimated_hours}ч
            </span>
          )}

          {/* Checklist progress */}
          {checklistProgress && checklistProgress.total > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {checklistProgress.done}/{checklistProgress.total}
            </span>
          )}

          {/* Assignees */}
          {card.assignee_ids && card.assignee_ids.length > 0 && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {card.assignee_ids.length}
            </span>
          )}

          {/* Tender link */}
          {card.tender_id && (
            <span className="flex items-center gap-1 text-primary">
              <Briefcase className="h-3 w-3" />
              Тендер
            </span>
          )}
        </div>

        {/* Actions */}
        {(onDelete || onUpdate) && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onUpdate && (
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать карточку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Приоритет</Label>
                <Select
                  value={editData.priority}
                  onValueChange={(v) => setEditData({ ...editData, priority: v as CardPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="normal">Обычный</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="urgent">Срочный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Срок</Label>
                <Input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Оценка (часы)</Label>
              <Input
                type="number"
                value={editData.estimated_hours}
                onChange={(e) => setEditData({ ...editData, estimated_hours: e.target.value })}
                min="0"
                step="0.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave}>Сохранить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
