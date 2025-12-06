"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget } from "./DashboardCustomizer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Trash2 } from "lucide-react";

interface SortableWidgetProps {
  widget: Widget;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SortableWidget({ widget, onToggle, onRemove }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${!widget.enabled ? "opacity-50" : ""}`}
    >
      <div className="cursor-grab text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex items-center gap-3 flex-1">
        <div className="text-2xl">{"icon" in widget ? (widget as { icon: string }).icon : "📦"}</div>
        <div className="flex-1">
          <div className="font-medium text-sm">{"name" in widget ? (widget as { name: string }).name : widget.id}</div>
          <div className="text-xs text-muted-foreground">
            {"description" in widget ? (widget as { description: string }).description : "Виджет дашборда"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={widget.enabled} onCheckedChange={() => onToggle(widget.id)} />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(widget.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
